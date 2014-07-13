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
var redisClient = require('../redis/connect');
var msgSave = require('../msg/msgsave');

//add to brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var group = function() {
    return group.init.apply(this, arguments);
};

(function(exp) {

    exp.conf = {
        group: {},
        groupName: {},
        msgStack: {},
        isFirstTime: true
    };

    exp.init = function() {
        //sub the group's channel
        var redisHost = hash.getHash('GRedis', appInfo.id);

        redisConnect.sub(redisHost.port, redisHost.ip, 'Group.' + appInfo.id, function(message) {
            console.log('   [group message] ' + message);
            var info = JSON.parse(message);
            if (info.order == 'MSG') {
                //send msg
                exp.groupMsg(info);
            } else if (info.order == 'SYS') {
                if (info.action == 'groupChange' || info.action == 'GMemberAdd' || info.action == 'GMemberRemove') {
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
        if (!gId) {
            return false;
        }
        exp.conf.msgStack[gId] = exp.conf.msgStack[gId] || {};
        exp.conf.msgStack[gId].list = exp.conf.msgStack[gId].list || [];
        exp.conf.msgStack[gId].list.push(msg);
        exp.conf.msgStack[gId].sta = exp.conf.msgStack[gId].sta || false;

        if (exp.conf.msgStack[gId].sta == 'ing') {
            return false;
        }
        exp.getFromRedis(gId, function(res) {
            if (!res || exp.conf.isFirstTime || !exp.conf.msgStack[gId].sta || !exp.conf.group[gId]) {

                //if the group server start frist time 
                //reload the memberlist from php api not redis
                exp.conf.isFirstTime = false;
                exp.conf.msgStack[gId].sta = 'ing';
                exp.getGroupMember(gId, function(memberInfo) {

                    if (memberInfo.count > 0) {
                        exp.conf.group[gId] = {};
                        //save the group name 
                        exp.conf.groupName[gId] = {};
                        exp.conf.groupName[gId].groupname = memberInfo.groupName || '';

                        //prepare
                        var meb = {};
                        var members = memberInfo.members;
                        for (var i = 0, len = members.length; i < len; i++) {
                            var thisMember = members[i];
                            meb[thisMember.user_id] = thisMember.username;
                        }
                        //exp.saveToRedis
                        exp.saveToRedis(gId, meb, function() {
                            exp.conf.msgStack[gId].sta = 'ok';
                            //run the stack MSG
                            var stackMsg = exp.conf.msgStack[gId].list;
                            for (var j = 0, jLen = stackMsg.length; j < jLen; j++) {
                                exp.groupMsg(stackMsg[j]);
                            }

                            delete exp.conf.msgStack[gId].list;
                        });
                    } else {
                        exp.conf.msgStack[gId].sta = 'ok';

                        delete exp.conf.msgStack[gId].list;
                    }

                });
            } else {
                msg.groupname = exp.conf.groupName[gId] ? (exp.conf.groupName[gId].groupname || '') : '';
                exp.groupMessageSend(res, msg);
                delete exp.conf.msgStack[gId].list;
            }
        });
    };

    exp.getFromRedis = function(gid, callback) {
        var redisPort = conf.sta.redis.cache.port;
        var redisIp = conf.sta.redis.cache.ip;
        var groupKey = 'group:' + gid + ':users';
        redisClient.connect(redisPort, redisIp, function(client) {
            client.hgetall(groupKey, function(err, res) {
                if (callback) callback(res);
            });
        });
    };

    /**
     * save the group info to redis
     * @package members {id:name,id:name}
     * @return {Null}
     */
    exp.saveToRedis = function(gid, members, callback) {
        var redisPort = conf.sta.redis.cache.port;
        var redisIp = conf.sta.redis.cache.ip;
        redisClient.connect(redisPort, redisIp, function(client) {
            var groupKey = 'group:' + gid + ':users';
            //delete old data
            client.del(groupKey, function() {
                //insert
                client.hmset(groupKey, members, function() {
                    if (callback) callback();
                });
            });

        });
    };

    /**
     * @param groupInfo {object}
     * @param groupInfo[groupid] {object}
     * @param groupInfo[groupid][userid] {object}
     * @param groupInfo[groupid][userid].name {String}
     */
    exp.groupMessageSend = function(groupInfo, msg) {
        //cache redis
        var redisStack = {};
        for (var i in groupInfo) {
            var redis = hash.getHash('PRedis', i);
            var pRedisId = redis.id;
            redisStack[pRedisId] = redisStack[pRedisId] || {};
            redisStack[pRedisId].redis = redisStack[pRedisId].redis || redis;
            redisStack[pRedisId].users = redisStack[pRedisId].users || [];
            redisStack[pRedisId].users.push(i);
        }
        for (var j in redisStack) {
            exp.sendByRedis(redisStack[j], msg);
        }
    };

    /**
     * @param redisInfo {object}
     * @param redisInfo[pRedisId] {object}
     * @param redisInfo[pRedisId].redis {object} redis info
     * @param redisInfo[pRedisId].users {Array} user info
     */
    exp.sendByRedis = function(redisInfo, msg) {
        var host = redisInfo.redis;
        redisConnect.connect(host.port, host.ip, function(client) {
            var users = redisInfo.users || [];
            var userLen = users.length;
            var pushNum = 0;
            var onlineU = [];
            var offlineU = [];

            client.select('0', function() {
                for (var j = 0, len = userLen; j < len; j++) {
                    exp.sendToPerson(users[j], client, msg, msgSended);
                }
            });

            function msgSended(res, user) {
                if (res == 'online') {
                    onlineU.push(parseInt(user));
                } else if (res == 'offline') {
                    offlineU.push(parseInt(user));
                    //set to offline
                    //offline.setMsg(msg, user, msg.poster);
                } else {

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
            }
        });
    };

    /**
     * sendToPerson
     * @param user
     * @param client
     * @param msg
     */
    exp.sendToPerson = function(user, client, msg, callback) {
        client.sismember('online', user, function(err, res) {
            if (res === 1) {
                //scoket is online
                client.publish('Room.' + user, JSON.stringify(msg));
                if (callback) callback('online', user);
            } else {
                //socket is offline
                msg.togroupuser = user;
                //offline.setMsg(msg, user, msg.poster);
                if (callback) callback('offline', user);
            }
        });

        //save the message status to mongodb
        msgSave.sta({
            'messageId': msg.messageId,
            'touser': parseInt(user),
            'poster': parseInt(msg.poster),
            'type': 1,
            'time': msg.time
        });
    };

    /**
     * get group member form the server
     * @param gid
     * @param callback
     */
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

    /**
     * messagePushResult
     * @param msg
     */
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
                $set: setVal,
            }, function(err, res) {
                if (err) {
                    console.log('[group.js update failed]--->', '\n\t err:', err, setVal);
                    return false;
                }
                console.log('[group.js update success]--->', msgId, '\n\t ', setVal, res);
            });

        });

        //group push
        //console.log('!!!!!!!!!!!!!',msg, msg.offline.join(','), msg.poster)
        offline.pushMessage(msg, msg.offline.join(','), msg.poster);

    };

})(group);

group();