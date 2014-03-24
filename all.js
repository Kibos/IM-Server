var appInfo = {
    port : 4001,
    type : 'PNode',
    id : 'pn1',
    ip : require('os').networkInterfaces()['eth0'][0].address
};

var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');
var hash = require('./lib/hash/hash.js');
var brain = require('./lib/brain/brain');

var app = new clst({
    cups : 1
});

app.init = function(cluster) {

    var io = require('socket.io').listen(appInfo.port, {
        log : false
    });
    brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

    io.sockets.on('connection', function(socket) {
        var host;
        var PRedis = {};
        var onLineRedis = null;

        socket.on('ybmp', function(data) {
            var rec = null;

            if ( typeof (data) == "string") {
                try {
                    rec = JSON.parse(data);
                } catch(e) {
                    socket.emit('ybmp', 'wrong data format ：', data);
                    return false;
                }
            } else {
                rec = data
            }

            //case
            if (rec.order == 'REG') {
                //the Reg part
                host = rec.host;

                var room = "Room." + rec.host;

                PRedis = hash.getHash('PRedis', rec.host);

                //connect to the redis
                //from，to，type，content
                var client = redis.createClient(PRedis.port, PRedis.ip);
                PRedis.connection = client;
                onLineRedis = redis.createClient(PRedis.port, PRedis.ip);

                client.on("ready", function() {
                    //TODO:if the redis is down,what will you do?
                    
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
                    };
                    socket.emit('ybmp', ret);

                });

            } else if (rec.order == 'MSG') {
                //the MSG part
                if (rec.touser) {
                    var redisHost = hash.getHash('PRedis', rec.touser);
                    var text = rec.text;
                    var room = "Room." + rec.touser;
                    //connect to the redis
                    var client = redis.createClient(redisHost.port, redisHost.ip);
                    client.on("ready", function() {
                        var ret = {
                            "order" : rec.order,
                            "status" : 200,
                            "poster" : rec.poster,
                            "touser" : rec.touser,
                            "text" : rec.text
                        };
                        client.publish(room, JSON.stringify(ret));
                        client.end();
                        socket.emit('ybmp', ret);
                    });
                } else if (rec.togroup) {
                    var groupServer = hash.getHash('GNode', rec.togroup);
                    console.log(groupServer);
                    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
                    var client = redis.createClient(groupRedis.port, groupRedis.ip);
                    var room = "Group." + groupServer.id;
                    //var redisHost = hash.getHash('GRedis', rec.togroup);
                    //var client = redis.createClient(redisHost.port, redisHost.ip);
                    //var room = "Group." + rec.togroup;
                    client.on("ready", function() {
                        var ret = {
                            "order" : rec.order,
                            "status" : 200,
                            "poster" : rec.poster,
                            "togroup" : rec.togroup,
                            "text" : rec.text
                        };
                        client.publish(room, JSON.stringify(ret));
                        client.end();

                        socket.emit('ybmp', ret);
                    });
                }
            }
        });

        socket.on('disconnect', function(data) {
            if (onLineRedis) {
                onLineRedis.srem("online", host, function(err, res) {
                    //TODO:if res is 1 ,that's mean delete filed,so...
                    onLineRedis.end();
                    PRedis.connection.end();
                });
            }
        });
        //
    });

    //

};

app.start();

