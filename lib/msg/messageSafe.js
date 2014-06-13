'use strict';
var restful = require('../restful/restful');
var conf = require('../../conf/config');

var redisClient = require('../redis/connect');
var redisPort = conf.sta.redis.cache.port;
var redisIp = conf.sta.redis.cache.ip;

function isFriend(poster, receiver, token, option, callback) {
    if(!poster || !receiver || !token){
        if (callback) callback(false); 
        return false;
    }
    redisClient.connect(redisPort, redisIp, function(client) {
        client.select('2', function() {
            var setName = 'user:' + poster + ':friends';
            client.sismember(setName, receiver, function(err, isMem) {
                if (isMem) {
                    if (callback) callback(true);
                } else {
                    getFriend(token, function(members) {
                        client.del(setName, function() {
                            client.sadd(setName, members, function() {
                                if (members.indexOf(receiver.toString()) != '-1') {
                                    if (callback) callback(true);
                                } else {
                                    console.log(members);
                                    if (callback) callback(false);
                                }
                            });
                        });
                    });
                }
            });
        });
    });
}

function getFriend(token, callback) {
    var reqData = {
        hostname: conf.sta.friend.api.ip,
        port: conf.sta.friend.api.port,
        path: '/api/v1/user/friends?kind=2&access_token=' + token,
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
                members.push(membersInfo[i].user_id.toString());
            }
            if (callback) callback(members);
        }
    };
    restful.get(reqData);
}

/**
 * method friendCheck
 * param option.catch
 **/

// function frinedCheck(poster, receiver, token, option, callback) {
//     if (option.
//         catch == undefined) {
//         console.log('can\'t get catch in friendCheck(messageSafe,js)');
//         return false;
//     }
//     if (option.
//         catch.friends == undefined) {
//         //nocache , try to get from http
//         getFriend(token, memberGet);
//     } else {
//         //have list tyr to find relation
//         if (option.
//             catch.friends.indexOf(receiver.toString()) != -1) {
//             //success
//             if (callback) callback(true);
//         } else {
//             //try to get from http
//             getFriend(token, memberGet);
//         }
//     }

//     function memberGet(members) {
//         option.
//         catch.friends = members;
//         if (members.indexOf(receiver.toString()) != -1) {
//             if (callback) callback(true);
//         } else {
//             console.log(receiver, ' is not your firend')
//             //console.log('*********Friends***********\n', option.
//             //catch.friends, '\n*************************');
//             if (callback) callback(false);
//         }
//     }
// };

// function getFriend(token, callback) {
//     var reqData = {
//         hostname: conf.sta.friend.api.ip,
//         port: conf.sta.friend.api.port,
//         path: '/api/v1/user/friends?kind=2&access_token=' + token,
//         callback: function(data) {

//             var json;
//             try {
//                 json = JSON.parse(data);
//             } catch (e) {
//                 json = {}
//             }
//             var membersInfo = json.data ? json.data.friends : [];
//             //console.log('-----> get Frined(messageSafe)',membersInfo)
//             var members = [];
//             for (var len = membersInfo.length, i = 0; i < len; i++) {
//                 members.push(membersInfo[i].user_id.toString());
//             }
//             if (callback) callback(members)
//         }
//     }
//     restful.get(reqData);
// };

//exports.friend = frinedCheck;
exports.friend = isFriend;