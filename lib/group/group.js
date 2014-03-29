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
                console.log('   [group] ' + message)
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
                
                redisConnect.connect(host.port, host.ip,function(client){
                    var users = redisStack[i]['users'];
                    for (var j = 0, len = users.length; j < len; j++) {
                        (function(j, client, msg) {

                            client.sismember('online', users[j], function(err, res) {
                                if (res === 1) {
                                    //scoket is online
                                    client.publish('Room.' + users[j], JSON.stringify(msg));
                                } else {
                                    //socket is offline
                                    //TODO:push to client or do nothing
                                }
                            })
                        })(j, client, msg);
                    }
                });
                
                
            })(i, redisStack, msg)
        }
    };
})(group);

group();
