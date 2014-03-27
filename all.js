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

//redis pool
// var redisConnect = (function() {
    // var redisPool = {};
    // return function(port, ip, callback) {
        // var cid = port.toString() + ip.toString();
        // redisPool[cid] = redisPool[cid] || {};
        // if (redisPool[cid]['sta'] == 'ok') {
            // callback && callback(redisPool[cid]['client']);
        // } else {
            // if (redisPool[cid]['sta'] == 'progress') {
                // redisPool['stack'] = redisPool['stack'] || [];
                // redisPool['stack'].push(callback);
            // } else {
                // redisPool[cid]['sta'] = 'progress';
                // redisPool['stack'] = redisPool['stack'] || [];
                // redisPool['stack'].push(callback);
                // var client = redis.createClient(port, ip);
                // client.on("ready", function() {
                    // redisPool[cid]['sta'] = 'ok';
                    // redisPool[cid]['client'] = client;
                    // //do all the callback
                    // for (var i = 0; i < redisPool['stack'].length; i++) {
                        // redisPool['stack'][i](client);
                    // }
                    // redisPool['stack'] = [];
                // });
            // };
        // }
    // }
// })();
////redis pool

var io = require('socket.io').listen(appInfo.port, {
    log : false
});
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

io.sockets.on('connection', function(socket) {
    var host;
    var PRedis = {};
    var onLineRedis = null;

    socket.on('ybmp', function(data) {
        console.log('----ybmp----', data)
        var rec = null;

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

            //connect to the redis
            var client = redis.createClient(PRedis.port, PRedis.ip);
            PRedis.connection = client;
            onLineRedis = redis.createClient(PRedis.port, PRedis.ip);

            client.on("ready", function() {
                //TODO:if the redis is disconnected by any reason,what will you do?

                //set redis online
                onLineRedis.sadd("online", host);
                //

                client.on('message', function(channel, message) {
                    try {
                        socket.emit('ybmp', JSON.parse(message));
                    } catch(e) {
                        socket.emit('ybmp', message);
                    }
                });
                client.subscribe(room);
                //return
                var ret = {
                    "order" : "REG",
                    "status" : 200,
                    "room" : room,
                    "host" : host
                }
                socket.emit('ybmp', ret);

            });

        } else if (rec.order == 'MSG') {
            //the MSG part
            if (rec.touser) {
                var redisHost = hash.getHash('PRedis', rec.touser);
                var text = rec.text;
                var room = "Room." + rec.touser;
                //connect to the redis
                redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
                    var ret = {
                        "order" : rec.order,
                        "status" : 200,
                        "poster" : rec.poster,
                        "touser" : rec.touser,
                        "text" : rec.text
                    }
                    client.publish(room, JSON.stringify(ret));

                    if (rec.touser == host) {
                        //self replay
                        socket.emit('ybmp', ret);
                    } else {
                        //send to other
                        client.sismember('online', rec.touser, function(err, isOnline) {
                            //console.log('user ' + rec.touser + ' online status : ' + isOnline);
                            if (isOnline) {
                                //online
                                socket.emit('ybmp', ret);
                            } else {
                                //offline
                            };
                        })
                    }

                });

                //log it to server (psersonal msg)
                var msgData = {
                    "type" : "0",
                    "from" : rec.poster,
                    "to" : rec.touser,
                    "content" : rec.text,
                    "time" : new Date()
                }
                mongoLarvel.collection('Message').insert(msgData, function(err, res) {
                    //console.log('    [DB] ', err, res);
                });
            } else if (rec.togroup) {
                var groupServer = hash.getHash('GNode', rec.togroup);
                if(!groupServer){
                    return false;
                }
                var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
                var room = "Group." + groupServer.id;
                
                
                redisConnect.connect(groupRedis.port, groupRedis.ip,function(client) {
                    var ret = {
                        "order" : rec.order,
                        "status" : 200,
                        "poster" : rec.poster,
                        "togroup" : rec.togroup,
                        "text" : rec.text
                    }
                    client.publish(room, JSON.stringify(ret));

                    socket.emit('ybmp', ret);
                });
                // var client = redis.createClient(groupRedis.port, groupRedis.ip);
                // client.on("ready", function() {
                    // var ret = {
                        // "order" : rec.order,
                        // "status" : 200,
                        // "poster" : rec.poster,
                        // "togroup" : rec.togroup,
                        // "text" : rec.text
                    // }
                    // client.publish(room, JSON.stringify(ret));
                    // client.end();
// 
                    // socket.emit('ybmp', ret);
                // });

                //log it to server (group msg)
                var msgData = {
                    "type" : "1",
                    "from" : rec.poster,
                    "to" : rec.togroup,
                    "content" : rec.text,
                    "time" : new Date()
                }
                mongoLarvel.collection('Message').insert(msgData, function(err, res) {
                    //console.log('    [DB] ', err, res);
                });
                //

            }
        }
    });

    socket.on('disconnect', function(data) {
        console.log('dis',data)
        if (onLineRedis) {
            onLineRedis.srem("online", host, function(err, res) {
                //TODO:if res is 1 ,that's mean delete filed,so...
                onLineRedis.end();
                PRedis.connection.end();
            });
        }
    });
});

