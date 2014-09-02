'use strict';
var restful = require('../restful/restful');
var conf = require('../../conf/config');

var redisClient = require('../redis/connect');
var redisPort = conf.sta.redis.cache.port;
var redisIp = conf.sta.redis.cache.ip;

var tempMember = {};

function isFriend(poster, receiver, token, option, callback) {

    if (!poster || !receiver || !token) {
        if (callback) callback(false);
        return false;
    }

    tempMember[poster] = tempMember[poster] || {};

    if (tempMember[poster].geting) {
        if (tempMember[poster].geting == 'ok') {
            judge(tempMember[poster].data);
        } else {
            tempMember[poster].callback = tempMember[poster].callback || [];
            tempMember[poster].callback.push(callback);
        }
    } else {
        if (!tempMember[poster].saved) {
            tempMember[poster].geting = true;
        }

        redisClient.connect(redisPort, redisIp, function(client) {
            client.select('2', function() {
                var setName = 'user:' + poster + ':friends';
                client.sismember(setName, receiver, function(err, isMem) {
                    if (isMem) {
                        if (callback) callback(true);
                    } else {
                        getFriend(token, function(members) {

                            tempMember[poster] = tempMember[poster] || {};
                            tempMember[poster].data = members;

                            var callbacks = tempMember[poster].callback;
                            if (callbacks) {
                                for (var i = 0, len = callbacks.length; i < len; i++) {
                                    if (members) {
                                        judge(members, callbacks.shift());
                                    }
                                }
                            }

                            tempMember[poster].geting = 'ok';

                            client.del(setName, function() {
                                client.sadd(setName, members, function() {
                                    tempMember[poster].saved = true;
                                    tempMember[poster].geting = false;
                                    delete tempMember[poster].data;
                                });
                            });
                        });
                    }
                });
            });
        });
    }

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
        hostname: conf.sta.friend.api.ip,
        agent: false,
        port: conf.sta.friend.api.port,
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