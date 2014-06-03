var appPort = 4101;
var appIp = require('os').networkInterfaces()['eth0'][0].address;
var appInfo = {
    port: appPort,
    type: 'GNode',
    id: 'gn_' + appIp + '_' + appPort,
    ip: appIp
};

var brain = require('../brain/brain');
var hash = require('../hash/hash');
var redis = require('redis');
var ybmp = require('../../api/ybmp');
var redisConnect = require('../redis/connect');
var conf = require('../../conf/config');
var restful = require('../restful/restful');
var ObjectID = require('mongodb').ObjectID;
var mongoClient = require('../mongodb/connect');
var offline = require('../msg/offline');

//add to brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var group = function() {
    return group['init'].apply(this, arguments);
};

(function(exp) {

    exp.conf = {
        group: {},
        groupName: {},
        msgStack: {}
    }

    exp.init = function() {

        //connect to the redis
        //port, ip, channel, callback

        var redisHost = hash.getHash('GRedis', appInfo.id);

        redisConnect.sub(redisHost.port, redisHost.ip, 'Group.' + appInfo.id, function(message) {
            console.log('   [group message] ' + message)
            var info = JSON.parse(message);
            if (info.order == 'MSG') {
                //send msg
                exp.groupMsg(info);
            } else if (info.order == 'SYS') {
                info.togroup = info.group;
                delete info.group;
                delete exp.conf.group[info.group];
                exp.groupMsg(info);
            }
        });
    };

    /**
     * @method groupMsg
     * publish group message
     * @param {Object} gId
     * @param {Object} msg
     */
    var temp = 0;

    exp.groupMsg = function(msg) {
        var gId = msg.togroup;
        console.log('[groupMsg]', msg);
        if (exp.conf.group[gId]) {
            msg.groupname = exp.conf.groupName[gId] ? (exp.conf.groupName[gId].groupname || 'undefined') : 'undefined';
            //post
        } else {
            //push to stack list
            exp.conf.msgStack[gId] = exp.conf.msgStack[gId] || {};
            exp.conf.msgStack[gId]['list'] = exp.conf.msgStack[gId]['list'] || [];
            exp.conf.msgStack[gId]['list'].push(msg);
            //get list
            if (exp.conf.msgStack[gId]['sta'] == 'ing') {
                return false;
            }
            exp.conf.msgStack[gId]['sta'] = 'ing';

            var options = {
                "hostname": conf.sta.group.api.ip,
                "port": conf.sta.group.api.port,
                //"path": "/api/v1/talks/" + gId + "/members?access_token=" + msg.access_token + "&creatorid=" + msg.groupfounder + "&kind=" + msg.kind,
                //"path": "/api/v1/talks/" + gId + "/members?internal_secret=cf7be73c856c99c0fe02a78a562375c5&creatorid=" + msg.groupfounder + "&kind=" + msg.kind,
                "path": "/api/v1/talks/" + gId + "/members?internal_secret=cf7be73c856c99c0fe02a78a562375c5",
                //"path": "/api/v1/talks/" + gId + "/memberids?internal_secret=cf7be73c856c99c0fe02a78a562375c5",
                "callback": function(Jdata) {
                    try {
                        var data = JSON.parse(Jdata);
                    } catch (e) {
                        console.log('group data error', Jdata);
                        return false;
                    }

                    console.log('[API group] got data from server', data);

                    if (data.response == 100) {
                        if (data.data.count > 0) {

                            var members = data.data.members;


                            exp.conf.group[gId] = {};

                            //save the group name 
                            exp.conf.groupName[gId] = {};

                            exp.conf.groupName[gId].groupname = data.data.groupName || '未命名群组';
                            //

                            for (var i = 0, len = members.length; i < len; i++) {
                                exp.conf.group[gId][members[i]['user_id']] = {
                                    name: members[i]['username']
                                }
                            };
                            //run the stack MSG
                            var stackMsg = exp.conf.msgStack[gId]['list'];
                            for (var i = 0, len = stackMsg.length; i < len; i++) {
                                exp.groupMsg(stackMsg[i])
                            }
                            delete exp.conf.msgStack[gId];
                            //console.log(gId + ' got ', members);
                        } else {
                            exp.conf.msgStack[gId]['sta'] = '';
                            //console.log(gId + ' have no user');
                        }
                    } else {
                        exp.conf.msgStack[gId]['sta'] = '';
                        console.log('    [API requerst error]', data.response, data.message);
                    }
                }
            };

            console.log('[API requerst ]', options.hostname + options.path);

            restful.get(options)
            return false;

        };

        //redisStack
        //catch user's reids
        var redisStack = {};
        for (i in exp.conf.group[gId]) {
            //console.log('group user ' + i);
            var user = exp.conf.group[gId][i];

            user.redis = user.redis || hash.getHash('PRedis', i);
            var pRedisId = user.redis['id'];
            redisStack[pRedisId] = redisStack[pRedisId] || {};
            redisStack[pRedisId]['redis'] = redisStack[pRedisId]['redis'] || user.redis;
            redisStack[pRedisId]['users'] = redisStack[pRedisId]['users'] || [];
            redisStack[pRedisId]['users'].push(i);
        }

        //send message to every one
        for (i in redisStack) {
            //asynchronous
            (function(i, redisStack, msg) {
                var host = redisStack[i]['redis'];

                redisConnect.connect(host.port, host.ip, function(client) {
                    var users = redisStack[i]['users'];
                    var userLen = users.length;
                    var pushNum = 0;
                    var onlineU = [];
                    var offlineU = [];
                    for (var j = 0, len = userLen; j < len; j++) {
                        (function(j, client, msg) {
                            var user = users[j];
                            client.sismember('online', user, function(err, res) {
                                if (res === 1) {
                                    //scoket is online
                                    client.publish('Room.' + user, JSON.stringify(msg));
                                    onlineU.push(user);
                                } else {
                                    //socket is offline
                                    msg.togroupuser = user;
                                    offline.setMsg(msg, user, msg.poster);
                                    offlineU.push(user);
                                }
                                pushNum++;
                                if (pushNum == userLen) {
                                    msg.online = onlineU;
                                    msg.offline = offlineU;
                                    msg.type = msg.type;
                                    messagePushResult(msg);
                                    onlineU = null;
                                    offlineU = null;
                                }
                            })
                        })(j, client, msg);
                    }
                });
            })(i, redisStack, msg)
        };
        //for offline message try to push to the drives

        //for group notification

        function messagePushResult(msg) {
            console.log('[group] 6 ：groupNotification ', msg);

            //if the message is group notification we update the database
            mongoClient.connect(function(mongoConnect) {

                var msgId = msg.msgid;
                console.log(msgId)
                var collection = mongoConnect.db("larvel").collection('Notices');

                collection.update({
                    "_id": parseInt(msgId)
                }, {
                    $push: {
                        hasrecieved: {
                            $each: msg.online
                        },
                        unrecieved: {
                            $each: msg.offline
                        }
                    },
                    $set: {
                        "status": 2
                    }
                }, function(err, res) {
                    if (err) {
                        console.log('[group.js update failed]--->', '\n\t err:', err);
                        return false;
                    }
                    console.log('[group.js update success]--->', '\n\t online:', msg.online, '\n\t offline:', msg.offline)
                })

            });

        }

    };
})(group);

group();