'use strict';

var appPort = 4101;
var appIp = require('os').networkInterfaces().eth0[0].address;
var appInfo = {
    port: appPort,
    type: 'GNode',
    id: 'gn_' + appIp + '_' + appPort,
    ip: appIp
};

var brain = require('../brain/brain');
var hash = require('../hash/hash');
var redisConnect = require('../redis/connect');
var conf = require('../../conf/config');
var restful = require('../restful/restful');
var mongoClient = require('../mongodb/connect');
var offline = require('../msg/offline');

//add to brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var group = function() {
    return group.init.apply(this, arguments);
};

(function(exp) {

    exp.conf = {
        group: {},
        groupName: {},
        msgStack: {}
    };

    exp.init = function() {

        //connect to the redis
        //port, ip, channel, callback

        var redisHost = hash.getHash('GRedis', appInfo.id);

        redisConnect.sub(redisHost.port, redisHost.ip, 'Group.' + appInfo.id, function(message) {
            console.log('   [group message] ' + message);
            var info = JSON.parse(message);
            if (info.order == 'MSG') {
                //send msg
                exp.groupMsg(info);
            } else if (info.order == 'SYS') {
                if (info.action == 'groupChange') {
                    info.togroup = info.group;
                    delete exp.conf.group[info.group];
                } else {
                    exp.groupMsg(info);
                }
            }
        });
    };

    /**
     * @method groupMsg
     * publish group message
     * @param {Object} gId
     * @param {Object} msg
     */

    exp.groupMsg = function(msg) {
        var gId = msg.togroup;
        console.log('[groupMsg]', msg, exp.conf.group[gId]);
        if (exp.conf.group[gId]) {
            msg.groupname = exp.conf.groupName[gId] ? (exp.conf.groupName[gId].groupname || 'undefined') : 'undefined';
            //post
        } else {
            //push to stack list
            exp.conf.msgStack[gId] = exp.conf.msgStack[gId] || {};
            exp.conf.msgStack[gId].list = exp.conf.msgStack[gId].list || [];
            exp.conf.msgStack[gId].list.push(msg);
            //get list
            if (exp.conf.msgStack[gId].sta == 'ing') {
                return false;
            }
            exp.conf.msgStack[gId].sta = 'ing';

            exp.getGroupMember(gId, function(memberInfo) {
                if (memberInfo.count > 0) {

                    var members = memberInfo.members;


                    exp.conf.group[gId] = {};

                    //save the group name 
                    exp.conf.groupName[gId] = {};

                    exp.conf.groupName[gId].groupname = memberInfo.groupName || '未命名群组';
                    //

                    for (var i = 0, len = members.length; i < len; i++) {
                        exp.conf.group[gId][members[i].user_id] = {
                            name: members[i].username
                        };
                    }
                    //run the stack MSG
                    var stackMsg = exp.conf.msgStack[gId].list;
                    for (var i = 0, len = stackMsg.length; i < len; i++) {
                        exp.groupMsg(stackMsg[i]);
                    }
                    delete exp.conf.msgStack[gId];
                } else {
                    exp.conf.msgStack[gId].sta = '';
                }
            });

            return false;

        }

        //redisStack
        //catch user's reids
        var redisStack = {};
        for (var i in exp.conf.group[gId]) {
            //console.log('group user ' + i);
            var user = exp.conf.group[gId][i];

            user.redis = user.redis || hash.getHash('PRedis', i);
            var pRedisId = user.redis.id;
            redisStack[pRedisId] = redisStack[pRedisId] || {};
            redisStack[pRedisId].redis = redisStack[pRedisId].redis || user.redis;
            redisStack[pRedisId].users = redisStack[pRedisId].users || [];
            redisStack[pRedisId].users.push(i);
        }

        //send message to every one
        for (i in redisStack) {
            //asynchronous
            (function(i, redisStack, msg) {
                var host = redisStack[i].redis;

                redisConnect.connect(host.port, host.ip, function(client) {
                    var users = redisStack[i].users;
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
                                    exp.messagePushResult(msg);
                                    onlineU = null;
                                    offlineU = null;
                                }
                            });
                        })(j, client, msg);
                    }
                });
            })(i, redisStack, msg);
        };
    };

    exp.groupMessageSend = function(groupid) {

    };

    exp.getGroupMember = function(gid, callback) {
        var options = {
            'hostname': conf.sta.group.api.ip,
            'port': conf.sta.group.api.port,
            'path': '/api/v1/talks/' + gid + '/members?internal_secret=cf7be73c856c99c0fe02a78a562375c5',
            'callback': function(Jdata) {
                var data = {};
                try {
                    data = JSON.parse(Jdata);
                } catch (e) {
                    console.log('group data error', Jdata);
                    if (callback) callback(data);
                    return false;
                }
                console.log('[API group] got data from server', data);
                if (data.response == 100) {
                    if (callback) callback(data.data);
                } else {
                    console.log('    [API requerst error]', data.response, data.message);
                }
            }
        };
        restful.get(options);
        console.log('[API requerst ]', options.hostname + options.path);
    };

    exp.messagePushResult = function(msg) {
        console.log('[group] 6 ：groupNotification ', msg);
        //if the message is group notification we update the database
        mongoClient.connect(function(mongoConnect) {

            var msgId = msg.msgid;

            var setVal = {};
            setVal['groups.' + msg.togroup + '.hasrecieved'] = msg.online;
            setVal['groups.' + msg.togroup + '.unrecieved'] = msg.offline;
            setVal.status = 2;

            var collection = mongoConnect.db('larvel').collection('Notices');
            collection.update({
                '_id': parseInt(msgId)
            }, {
                $set: setVal
            }, function(err, res) {
                if (err) {
                    console.log('[group.js update failed]--->', '\n\t err:', err);
                    return false;
                }
                console.log('[group.js update success]--->', msgId, '\n\t ', setVal);
            });

        });
    };

})(group);

group();