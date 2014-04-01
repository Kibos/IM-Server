var appInfo = {
    port : 4009,
    type : 'GNode',
    id : 'gn1',
    ip : require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain');
var hash = require('../hash/hash');
var redis = require('redis');
var ybmp = require('../../api/ybmp');
var redisConnect = require('../redis/connect');
var conf = require('../../conf/config');

//add to brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var group = function() {
    return group['init'].apply(this, arguments);
};

(function(exp) {
    exp.conf = {
        group : {
            'G1' : {
                '1' : {
                    name : 'song'
                },
                '2' : {
                    name : 'zhu'
                },
                '3' : {
                    name : 'zhu'
                },
                '4' : {
                    name : 'zhu'
                },
                '5' : {
                    name : 'zhu'
                },
                '6' : {
                    name : 'zhu'
                },
                '7' : {
                    name : 'zhu'
                },
                '8' : {
                    name : 'zhu'
                },
                '9' : {
                    name : 'zhu'
                },
                '10' : {
                    name : 'zhu'
                }
            }
        }
    }
    exp.init = function() {
        //connect to the redis
        var redisHost = hash.getHash('GRedis', appInfo.id);

        var client = redis.createClient(redisHost.port, redisHost.ip);
        client.on("ready", function() {
            client.on('message', function(channel, message) {
                console.log('   [group message] ' + message)
                var info = JSON.parse(message);
                if (info.order == 'MSG') {
                    //send msg
                    exp.groupMsg(info);
                }
            });
            client.subscribe('Group.' + appInfo.id);
            console.log('   [Group] listen redis ' + 'Group.' + appInfo.id + '@' + redisHost.ip + ':' + redisHost.port);
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
        if (exp.conf.group[msg.togroup]) {
            //post
        } else {
            //get list
        };

        //redisStack
        //catch user's reids
        var redisStack = {};
        for (i in exp.conf.group[gId]) {
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
                                    offline(msg);
                                    offlineU.push(user);
                                }
                                pushNum++;
                                if (pushNum == userLen) {
                                    var messageInfo = {
                                        online : onlineU,
                                        offline : offlineU,
                                        type : msg.type
                                    }
                                    messagePushResult(messageInfo);
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
        function offline(msg) {
            if (msg.type === 'groupNotification') {
                //in group notification we needn't push offline message
                //the other serve will do this .
                return false;
            }
            redisConnect.connect(conf.sta.PPSH.pp1.port, conf.sta.PPSH.pp1.ip, function(client) {
                client.publish('plugpush', JSON.stringify(msg));
            });
        };
        //for group notification
        function messagePushResult(msg) {
            //if the message is group notification we sand this message to plugpush server
            if (msg.type == "groupNotification") {
                msg.type = "groupNotificationBack";
                redisConnect.connect(conf.sta.PPSH.pp1.port, conf.sta.PPSH.pp1.ip, function(client) {
                    client.publish('plugpush', JSON.stringify(msg));
                });
            };
        }

    };
})(group);

group();
