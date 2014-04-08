var conf = require('./conf/config');
var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');

var redisConnetion = require('./lib/redisConnection');
var app = new clst({
    cups : 1
});

app.init = function(cluster) {
    var port = conf.socket.port;

    var io = require('socket.io').listen(port);
    io.sockets.on('connection', function(socket) {
        var client = null;
        socket.on('ybmp', function(data) {
            var order = ybmp.decode(data);
            var orderData = order.data;
            var host = orderData.host;
            var type = orderData.type;
            //case
            if (order.order == 'REG') {
                var room = "Room." + orderData.host;
                console.log('**************regRoom',room);
                //connect to the redis
                client = redis.createClient(6379, conf.redis.servers[0]);
                //var client = redis.createClient(6379, '10.21.3.66');
                client.on("ready", function() {
                    client.on('message', function(channel, message) {
                        console.log('..............', message)
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
                });

            } else if (order.order == 'MSG') {
                var text = orderData.text;
                var room = "Room." + orderData.touser;
                console.log('*************msgRoom',room);
                //connect to the redis
                client = redis.createClient(6379, conf.redis.servers[0]);
                //var client = redis.createClient(6379, '10.21.3.66');
                client.on("ready", function() {
                    var ret = {
                        "room" : room,
                        "host" : host,
                        "type" : type
                    }
                    
                    client.publish(room,ybmp.encode(order.order, 200, orderData));
                    client.end();
                    
                    ybmpStr = ybmp.encode(order.order, 200, orderData);
                    socket.emit('ybmp', ybmpStr);
                });
                //client.publish(channel, text);
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

