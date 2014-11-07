'use strict';

var conf = require('../conf/config');
var appInfo = conf.NodeInfo.GNode2;
var brain = require('../tool/brain');
var hash = require('../tool/hash/hash');
var redisConnect = require('../connect/redis');
var mongoClient = require('../connect/mongo');
var restful = require('../tool/restful');
var offline = require('../tool/msg/offline');
var msgSave = require('../tool/msg/msgsave');

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
                info.group = info.togroup;
                if (info.action == 'groupChange' || info.action == 'GMemberAdd' || info.action == 'GMemberRemove' || info.action == 'GCreaterChange') {
                    //remove cache first the send the message

                    delete exp.conf.group[info.group];
                    //
                    if (info.action == 'GMemberAdd' || info.action == 'GMemberRemove' || info.action == 'GCreaterChange') {
                        exp.groupMsg(info);
                    }

                } else {
                    exp.groupMsg(info);
                }
            } else {
                console.error('[group server][init] is false');
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
                    if (memberInfo.members && memberInfo.members.length > 0) {
                        exp.conf.group[gId] = {};
                        //save the group name 
                        exp.conf.groupName[gId] = {};
                        exp.conf.groupName[gId].groupname = memberInfo.groupName || '';

                        //exp.saveToRedis
                        exp.saveToRedis(gId, memberInfo.members, memberInfo.chat, function() {
                            exp.conf.msgStack[gId].sta = 'ok';
                            //run the stack MSG
                            var stackMsg = exp.conf.msgStack[gId].list;

                            for (var j = 0, jLen = (stackMsg ? stackMsg.length : 0); j < jLen; j++) {
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

                msg.groupname = msg.groupname || (exp.conf.groupName[gId] ? (exp.conf.groupName[gId].groupname || '') : '');
                exp.groupMessageSend(res, msg);
                delete exp.conf.msgStack[gId].list;
            }
        });
    };

    exp.getFromRedis = function(gid, callback) {
        var redisPort = conf.sta.redis.cache.port;
        var redisIp = conf.sta.redis.cache.ip;
        var groupKey = 'group:' + gid + ':users';
        redisConnect.connect(redisPort, redisIp, function(client) {
            client.select('0', function(){
                client.HGETALL(groupKey, function(err, res) {
                    if (err) {
                        console.log('[group server][getFromRedis] is false');
                    }
                    callback(res);
                });
            });
        });
    };

    /**
     * save the group info to redis
     * @package members {id:name,id:name}
     * @return {Null}
     */
    exp.saveToRedis = function(gid, usersId, isChat, callback) {
        var redisPort = conf.sta.redis.cache.port;
        var redisIp = conf.sta.redis.cache.ip;
        redisConnect.connect(redisPort, redisIp, function(client) {
            var groupKey = 'group:' + gid + ':users';
            //delete old data
            client.del(groupKey, function() {
                //insert
                client.hmset(groupKey, 'usersId', usersId, 'isChat', isChat, function() {
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
        console.log('[group server][groupMessageSend] groupInfo is ', groupInfo);
        var userIds = groupInfo.usersId.split(',');
        //cache redis
        var redisStack = {};
        for (var i in userIds) {
            var redis = hash.getHash('PRedis', userIds[i]);
            var pRedisId = redis.id;
            redisStack[pRedisId] = redisStack[pRedisId] || {};
            redisStack[pRedisId].redis = redisStack[pRedisId].redis || redis;
            redisStack[pRedisId].users = redisStack[pRedisId].users || [];
            redisStack[pRedisId].users.push(userIds[i]);
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
                } else {
                    console.log('[group server][sendToPerson] is falsed. err is res not exist.');
                }
                pushNum++;
                if (pushNum == userLen) {
                    msg.online = onlineU;
                    msg.offline = offlineU;
                    // msg.type = msg.type;
                    exp.messagePushResult(msg, onlineU, offlineU);
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
            //'path': '/api/v1/talks/' + gid + '/members?internal_secret=cf7be73c856c99c0fe02a78a562375c5',
            'path': '/api/v1/talks/' + gid + '/memberids?internal_secret=cf7be73c856c99c0fe02a78a562375c5',
            'callback': function(Jdata) {
                var data = {};
                try {
                    data = JSON.parse(Jdata);
                } catch (e) {
                    console.log('group data error', Jdata);
                    if (callback) callback(data);
                    return false;
                }
                console.log('[API group] got data from server', data, '!got data from server');
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
    exp.messagePushResult = function(msg, onlineUser, offlineUser) {
        //group push
        offline.pushMessage(msg, offlineUser.join(','), msg.poster);
        //save the message status to mongodb
        msgSave.sta({
            'messageId': msg.messageId,
            'poster': parseInt(msg.poster),
            'touser': offlineUser,
            'type': 1,
            'time': msg.time
        });
        //save only type is 6 or 7
        if (!(msg.type == 6 || msg.type == 7)) {
    	    console.log('[group] 6 ：groupNotification ', msg);
            return false;
        }

        //if the message is group notification we update the database
        mongoClient.connect(function(mongoConnect) {

                var msgId = msg.msgid;

                var setVal = {};
                setVal['groups.' + msg.togroup + '.hasrecieved'] = {
                    $each: onlineUser
                };
                setVal['groups.' + msg.togroup + '.unrecieved'] = {
                    $each: offlineUser
                };

                // { scores: { $each: [ 90, 92, 85 ] } }

            var collection = mongoConnect.db(conf.mongodb.mg3.dbname).collection('Notices');
            collection.update({
                '_id': parseInt(msgId)
            }, {
                $push: setVal,
                $set: {
                    status: 2
                }
            }, function(err, res) {
                if (err) {
                    console.log('[group.js update failed]--->', '\n\t err:', err, setVal);
                    return false;
                }
                console.log('[group.js update success]--->', msgId, '\n\t ', setVal, res);
            });
        },{ip: conf.mongodb.mg3.ip, port: conf.mongodb.mg3.port, name: 'update_msgPushResult'});
    };

})(group);

group();