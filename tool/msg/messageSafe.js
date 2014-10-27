'use strict';
var restful = require('../restful');
var redisClient = require('../../connect/redis');
var sta = require('../../conf/config').sta;

var redisPort = sta.redis.cache.port;
var redisIp = sta.redis.cache.ip;

var tempMember = {};

function isFriend(poster, receiver, token, option, callback) {

    if (!poster || !receiver || !token) {
        if (callback) callback(false);
        return false;
    }

    tempMember[poster] = tempMember[poster] || {};

    redisClient.connect(redisPort, redisIp, function(client) {

        client.select('2', function() {
            var setName = 'user:' + poster + ':friends';
            client.sismember(setName, receiver, function(err, isMem) {
           
                if (isMem) {
                    if (callback) callback(true);
                } else {
                    getFriend(token, function(members) {
                        if (!members) {
                            console.error('[messageSafe][ifFriend] getFriend members is ', members);
                            callback(false);
                        }
                        client.del(setName, function(err) {
                            if (!err) {
                                client.sadd(setName, members, function(err) {
                                    if (err) {
                                        console.error('[messageSafe][ifFriend] redis sadd false.');
                                        callback(false);
                                    }
                                });
                            } else {
                                console.error('[messageSafe][ifFriend] redis del false.');
                                callback(false);
                            }
                        });
                        judge(members);
                    });
                }
            });
        });
    });


    function judge(member, callback) {
        if (!member) {
            if (callback) callback(false);
            return false;
        }
        if (member.indexOf(receiver.toString()) != '-1') {
            if (callback) callback(true);
        } else {
            console.log('[messageSafe]friends List-->', member);
            if (callback) callback(false);
        }
    }

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

//exports.friend = frinedCheck;
exports.friend = isFriend;