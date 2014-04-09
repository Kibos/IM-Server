var conf = require('./conf/config');
var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');
var hash = require('./lib/hash/hash.js');
var net = require('net');

var redisConnetion = require('./lib/redisConnection');
var app = new clst({
    cups : 1
});

app.init = function(cluster) {
    var server = net.createServer();
    server.listen(4000, '10.21.3.62');

    server.on('connection', function(sock) {
        // 其它内容与前例相同
        // 为这个sock实例添加一个"data"事件处理函数
        sock.on('data', function(data) {
            var data = data.toString();
            var order = ybmp.decode(data);
            var orderData = order.data;

            if (order.order == 'REG') {
                var host = orderData.host;
                var type = orderData.type;
                //the Reg part
                var room = "Room." + orderData.host;
                var redisHost = hash.getHash('PRedis', orderData.host);
                //connect to the redis
                var client = redis.createClient(redisHost.port, redisHost.ip);
                client.on("ready", function() {
                    client.on('message', function(channel, message) {
                        sock.write(message);
                    });
                    client.subscribe(room);

                    //TODO:save online info to cache

                    //return
                    var ret = {
                        "room" : room,
                        "host" : host,
                        "type" : type
                    }
                    ybmpStr = ybmp.encode(order.order, 200, ret);
                    sock.write(ybmpStr);

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
                        sock.write(ybmpStr);
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
                        sock.write(ybmpStr);
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
                sock.write( ybmpStr);
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
                sock.write( ybmpStr);
            }

            // 回发该数据，客户端将收到来自服务端的数据
            //sock.write('You said "' + data + '"');
        });

        // 为这个sock实例添加一个"close"事件处理函数
        sock.on('close', function(data) {
            console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
        });
    });

};

app.start();

