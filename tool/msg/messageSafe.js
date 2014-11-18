'use strict';
var restful = require('../restful');
var redisClient = require('../../connect/redis');
var sta = require('../../conf/config').sta;

var redisPort = sta.redis.cache.port;
var redisIp = sta.redis.cache.ip;

function isFriend(poster, receiver, token, callback) {

    if (!poster || !receiver || !token) {
        if (callback) callback(false);
        return false;
    }

    redisClient.connect(redisPort, redisIp, function(client) {

        client.select('2', function() {
            var setName = 'user:' + poster + ':friends';
            client.sismember(setName, receiver, function(err, isMem) {

                if (!isMem) {
                    if (callback) callback(true);
                } else {
                    getFriend(token, function(members) {
                        if (!members) {
                            console.error('[messageSafe][ifFriend] getFriend members is ', members);
                            callback(false);
                        }

                        if (inMembers(members, receiver.toString())) {
                            callback(true);
                        }

                        client.del(setName, function(err) {
                            if(err) {
                                console.error('[isFriend][delete] redis members is false. err is ', err);
                                callback(false);
                            }
                            client.sadd(setName, members, function(err) {
                                if (err) {
                                    console.error('[messageSafe][ifFriend] redis sadd false.');
                                    callback(false);
                                }
                            });
                        });
                    });
                }
            });
        });
    });
}

function inMembers(members, touser) {
    return members.some(function(item) {
        return item === touser;
    });
}

function getFriend(token, callback) {
    var reqData = {
        hostname: sta.friend.api.ip,
        agent: false,
        port: sta.friend.api.port,
        path: '/api/v1/user/friends?kind=0&access_token=' + token,
        callback: function(data) {
            var json;
            try {
                json = JSON.parse(data);
            } catch (e) {
                json = {};
            }
            var membersInfo = json.data ? json.data.friends : [];
            var members = [];
            for (var len = membersInfo.length, i = 0; i < len; i++) {
                if (membersInfo[i] && membersInfo[i].user_id) {
                    members.push(membersInfo[i].user_id.toString());
                }
            }
            if (callback) callback(members);
        }
    };
    restful.get(reqData);
}

exports.friend = isFriend;