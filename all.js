var appInfo = {
    port : 4001,
    type : 'PNode',
    id : 'pn1',
    ip : require('os').networkInterfaces()['eth0'][0].address
}

// var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');
var hash = require('./lib/hash/hash.js');
var brain = require('./lib/brain/brain');
var restful = require('./lib/restful/restful');
var config = require('./conf/config');
var mongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server
var redisConnect = require('./lib/redis/connect');
var conf = require('./conf/config');

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
        mongoLarvel = mongoC.db("larvel");
    }
});
////mongodb part end

//start the socket.io
var io = require('socket.io').listen(appInfo.port, {
    log : false
});
////

//add to the brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);
////

//
var users = {}
////
io.sockets.on('connection', function(socket) {
    var host;
    var PRedis = {};
    var onLineRedis = null;
    socket.on('ybmp', function(data) {
        console.log('----ybmp----', data)
        var rec = null;
        var time = +new Date();

        if ( typeof (data) == "string") {
            try {
                rec = JSON.parse(data);
            } catch(e) {
                socket.emit('ybmp', 'wrong data format ：', data);
                return false;
            }
        } else {
            rec = data;
        }

        //case
        if (rec.order == 'REG') {
            //the Reg part
            host = rec.host;

            var room = "Room." + rec.host;

            PRedis = hash.getHash('PRedis', rec.host);

            //
            redisConnect.sub(PRedis.port, PRedis.ip, room, function(message) {
                try {
                    socket.emit('ybmp', JSON.parse(message));
                } catch(e) {
                    socket.emit('ybmp', message);
                }
            });

            onLineRedis = redis.createClient(PRedis.port, PRedis.ip);
            onLineRedis.on("ready", function() {
                onLineRedis.sadd("online", host);
            });

            var ret = {
                "order" : "REG",
                "status" : 200,
                "room" : room,
                "host" : host
            }
            socket.emit('ybmp', ret);
            

        } else if (rec.order == 'MSG') {
            console.log('    send MSG ', rec)
            //the MSG part
            if (rec.touser) {
                var redisHost = hash.getHash('PRedis', rec.touser);
                var text = rec.text;
                var room = "Room." + rec.touser;
                //connect to the redis
                redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
                    rec.status = 200;
                    rec.time = time;

                    client.publish(room, JSON.stringify(rec));

                    if (rec.poster == host) {
                        //self replay
                        socket.emit('ybmp', rec);
                    } else {
                        //send to other
                        client.sismember('online', rec.touser, function(err, isOnline) {

                            console.log('    user ' + rec.touser + ' online status : ' + isOnline);

                            if (isOnline) {
                                //online
                                socket.emit('ybmp', rec);
                            } else {
                                offline(rec);
                                //offline
                            };
                        })
                    }

                });
                function offline(msg) {
                    console.log('offline', msg);
                    redisConnect.connect(conf.sta.PPSH.pp1.port, conf.sta.PPSH.pp1.ip, function(client) {
                        client.publish('plugpush', JSON.stringify(msg));
                    });
                };

                //log it to server (psersonal msg)
                var msgData = {
                    "type" : "0",
                    "from" : rec.poster,
                    "to" : rec.touser,
                    "content" : rec.text,
                    "time" : time
                }
                mongoLarvel.collection('Message').insert(msgData, function(err, res) {
                    //console.log('    [DB] ', err, res);
                });
            } else if (rec.togroup) {
                var groupServer = hash.getHash('GNode', rec.togroup);
                if (!groupServer) {
                    return false;
                }
                var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
                var room = "Group." + groupServer.id;

                redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
                    rec.status = 200;
                    rec.time = time;
                    client.publish(room, JSON.stringify(rec));

                    socket.emit('ybmp', rec);
                });

                //log it to server (group msg)
                var msgData = {
                    "type" : "1",
                    "from" : rec.poster,
                    "to" : rec.togroup,
                    "content" : rec.text,
                    "time" : new Date()
                }
                mongoLarvel.collection('Message').insert(msgData, function(err, res) {
                });
                //

            }
        }
    });

    socket.on('disconnect', function(data) {
        console.log('disa', data)
        if (onLineRedis) {
            onLineRedis.srem("online", host, function(err, res) {
                //TODO:if res is 1 ,that's mean delete filed,so...
                onLineRedis.end();
                //PRedis.connection.end();
            });
        }
    });
});

console.log('   [ NodeServer ] start at ' + appInfo['ip'] + appInfo['port'])
