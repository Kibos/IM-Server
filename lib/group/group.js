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
var mongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var mongoCollection = null;

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
        },
        msgStack : {}
    }
    exp.init = function() {

        //mongodb part
        var mongoS = new Server("10.21.3.59", 27017);
        var mongoC = new mongoClient(mongoS, {
            native_parser : true
        });
        var mongoLarvel = null;
        mongoC.open(function(err, mongoclient) {
            if (err) {
                console.log('cant open the mongodb');
            } else {
                mongoCollection = mongoC.db("larvel").collection('Talks');
                startRedis();
            }
        });
        ////mongodb part end

        function startRedis() {
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
        }

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
        if (exp.conf.group[gId]) {
            //post
            console.log('post',exp.conf.group[gId])
        } else {
            //push to stack list
            exp.conf.msgStack[gId] = exp.conf.msgStack[gId] || {};
            exp.conf.msgStack[gId]['list'] = exp.conf.msgStack[gId]['list'] || [];
            exp.conf.msgStack[gId]['list'].push(msg);
            //get list
            mongoCollection.find({
                '_id' : parseInt(gId)
            }).toArray(function(err, res) {
                var i = 0;
                if (res.length !== 1) {
                    return false;
                } else {
                    //set members to exp.conf.group[gId]
                    var members = res[0]['members'];
                    exp.conf.group[gId] = {};
                    for (var i = 0, len = members.length; i < len; i++) {
                        exp.conf.group[gId][members[i]] = {
                            name : 'undefined'
                        }
                    };
                    //run the stack MSG
                    var stackMsg = exp.conf.msgStack[gId]['list'];
                    for (var i = 0, len = stackMsg.length; i < len; i++) {
                        exp.groupMsg(stackMsg[i])
                    }
                    delete exp.conf.msgStack[gId];
                }
            });
            return false;

            //get list
            // mongoCollection.find({
            // '_id' : 41
            // }).toArray(function(err, res) {
            // console.log(res);
            // console.log(exp.conf.group)
            // });
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
                redisConnect.connect(conf.sta.PPSH.pp1.port, conf.sta.PPSH.pp1.ip, function(client) {
                    client.publish('plugpush', JSON.stringify(msg));
                });
            };
        }

    };
})(group);

group();
