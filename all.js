var conf = require('./conf/config');
var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');
var hash = require('./lib/hash/hash.js');

var redisConnetion = require('./lib/redisConnection');
var app = new clst({
    cups : 1
});
app.init = function(cluster) {
    var port = conf.socket.port;

    var io = require('socket.io').listen(port);
    io.sockets.on('connection', function(socket) {
        socket.on('ybmp', function(data) {
            var order = ybmp.decode(data);
            var orderData = order.data;
            var host = orderData.host;
            var type = orderData.type;
            //case
            if (order.order == 'REG') {
                //the Reg part
                var room = "Room." + orderData.host;
                var redisHost = hash.getHash('PRedis', orderData.host);
                //connect to the redis
                var client = redis.createClient(redisHost.port, redisHost.ip);
                client.on("ready", function() {
                    client.on('message', function(channel, message) {
                        socket.emit('ybmp', message);
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
                } else if(orderData.togroup){
                    var redisHost = hash.getHash('GRedis', orderData.togroup);
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

        // socket.on('reg', function(data) {
        // if (user[data.username]) {
        // socket.emit('regback', {
        // 'sta' : 0,
        // 'msg' : data.username + '已经被使用了:('
        // });
        // } else {
        // user[data.username] = {
        // 'login' : new Date(),
        // 'socket' : socket
        // };
        // socket.store.username = data.username;
        // socket.emit('regback', {
        // 'sta' : 1,
        // 'name' : data.username
        // });
        // for (i in user) {
        // if (i !== data.username) {
        // user[i].socket.emit('newuser', {
        // username : data.username
        // });
        // }
        // }
        // }
        // });
        //
        // socket.on('publish', function(data) {
        // if (data.touser == 'all') {
        // console.log('all')
        // for (i in user) {
        // user[i].socket.emit('receive', {
        // 'poster' : data.username,
        // 'touser' : data.touser,
        // 'text' : data.text
        // });
        // }
        // } else {
        // if (user[data.touser]) {
        // console.log('user', data.touser);
        // user[data.touser].socket.emit('receive', {
        // 'poster' : data.username,
        // 'touser' : data.touser,
        // 'text' : data.text
        // });
        // if (data.touser != data.poster) {
        // socket.emit('receive', {
        // 'poster' : data.username,
        // 'touser' : data.touser,
        // 'text' : data.text
        // });
        // }
        // }
        // }
        //
        // });
        //
        // socket.on('getUsersList', function() {
        // var userList = [];
        // for (i in user) {
        // userList.push(i)
        // };
        // socket.emit('getUser', userList);
        // });

        // socket.on('disconnect', function(data) {
        // if (user[socket.store.username]) {
        // delete user[socket.store.username];
        //
        // var userList = [];
        // for (i in user) {
        // user[i].socket.emit('deleteUser', {
        // username : socket.store.username
        // });
        // };
        // };
        // });
        //

    });

};

app.start();

