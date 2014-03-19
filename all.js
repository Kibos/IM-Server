var appInfo = {
    port : 4001,
    type : 'PNode',
    id : 'pn1',
    ip : require('os').networkInterfaces()['eth0'][0].address
}

var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');
var hash = require('./lib/hash/hash.js');
var brain = require('./lib/brain/brain');

var app = new clst({
    cups : 1
});

app.init = function(cluster) {

    var io = require('socket.io').listen(appInfo.port);
    brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

    io.sockets.on('connection', function(socket) {
        socket.on('ybmp', function(data) {
            var order = ybmp.decode(data);
            var orderData = order.data;
            //case
            if (order.order == 'REG') {
                //the Reg part
                var host = orderData.host;
                var type = orderData.type;

                var room = "Room." + orderData.host;
                var redisHost = hash.getHash('PRedis', orderData.host);
                //connect to the redis
                var client = redis.createClient(redisHost.port, redisHost.ip);
                client.on("ready", function() {
                    client.on('message', function(channel, message) {
                        socket.emit('ybmp', message);
                    });
                    client.subscribe(room);
                    //return
                    var ret = {
                        "room" : room,
                        "host" : host,
                        "type" : type
                    }
                    ybmpStr = ybmp.encode(order.order, 200, ret);
                    socket.emit('ybmp', ybmpStr);

                    console.log('\x1B[31m \x1B[42m [S] REG Room:' + room + ' Reids', redisHost, ' \x1B[49m \x1B[39m')
                });

            } else if (order.order == 'MSG') {
                //the MSG part
                if (orderData.touser) {
                    var redisHost = hash.getHash('PRedis', orderData.touser);
                    var text = orderData.text;
                    var room = "Room." + orderData.touser;
                    //connect to the redis
                    var client = redis.createClient(redisHost.port, redisHost.ip);
                    client.on("ready", function() {
                        var ret = {
                            "poster" : orderData.poster,
                            "touser" : orderData.touser,
                            "text" : orderData.text
                        }
                        client.publish(room, ybmp.encode(order.order, 200, orderData));
                        client.end();

                        ybmpStr = ybmp.encode(order.order, 200, orderData);
                        socket.emit('ybmp', ybmpStr);
                    });
                } else if (orderData.togroup) {
                    var redisHost = hash.getHash('GRedis', orderData.togroup);
                    var client = redis.createClient(redisHost.port, redisHost.ip);
                    var room = "Group." + orderData.togroup;
                    client.on("ready", function() {
                        var ret = {
                            "poster" : orderData.poster,
                            "touser" : orderData.touser,
                            "text" : orderData.text
                        }
                        console.log(room)
                        client.publish(room, ybmp.encode(order.order, 200, orderData));
                        client.end();

                        ybmpStr = ybmp.encode(order.order, 200, orderData);
                        socket.emit('ybmp', ybmpStr);
                    });
                }
            } else if (order.order == "FRD") {
                //get firend & group list
                var ret = {
                    "userid" : orderData.host,
                    "friends" : {
                        '1' : {
                            name : 'Mofei'
                        },
                        '2' : {
                            name : 'Song'
                        },
                        '3' : {
                            name : 'Li'
                        }
                    }
                }
                ybmpStr = ybmp.encode(order.order, 200, ret);
                socket.emit('ybmp', ybmpStr);
            } else if (order.order == "GRP") {
                //get grouplist
                var ret = {
                    "userid" : orderData.host,
                    "friends" : {
                        'G1' : {
                            name : 'Group1'
                        },
                        'G2' : {
                            name : 'Group2'
                        },
                        'G3' : {
                            name : 'Group3'
                        }
                    }
                }
                ybmpStr = ybmp.encode(order.order, 200, ret);
                socket.emit('ybmp', ybmpStr);
            }
        });

    });

};

app.start();

