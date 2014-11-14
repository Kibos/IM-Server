'use strict';

var net = require('net');
var appInfo = {
    ip: process.argv[2],
    port: parseInt(process.argv[3])
};

var server = {};
var brain = function() {
    return brain.init.apply(this, arguments);
};

(function(exp) {
    var socketList = {};

    exp.init = function() {
        exp.server();
    };

    exp.add = function(obj, sock) {

        server[obj.type] = server[obj.type] || {};
        if (server[obj.type][obj.id]) {
            return false;
        }
        server[obj.type][obj.id] = {
            'ip': obj.ip,
            'port': obj.port
        };
        var socketName = sock.remoteAddress + ':' + sock.remotePort;
        socketList[socketName] = {
            'socket': sock,
            'info': obj
        };
        //server is the list of all the online server
        obj.hash = server;
        exp.push(obj, socketName);
    };

    exp.get = function() {

    };

    exp.remove = function(obj, socketName) {
        if (!obj) {
            return false;
        }
        if (server[obj.type]) {
            delete server[obj.type][obj.id];
        }
        delete socketList[socketName];
        obj.order = 'remove';
        exp.push(obj, socketName);
        console.log('########### ' + socketName + '###############');
    };

    exp.scan = function() {

    };

    exp.push = function(obj, socketName) {
        for (var i in socketList) {
            if (i == socketName) {
                obj.self = true;
            }
            socketList[i].socket.write(JSON.stringify(obj));
        }
    };

    exp.server = function() {
        net.createServer(function(sock) {
            var address, port, sockobj;

            address = sock.remoteAddress;
            port = sock.remotePort;

            sock.on('data', function(data) {
                var dataStr = data.toString();
                var orders = dataStr.match(/(\{.+?\})(?={|$)/g);
                if (orders == null) {
                    return false;
                }
                orders.forEach(function(data) {
                    var obj = JSON.parse(data);
                    if (obj.order == 'add') {
                        console.log(' ------', address, port, data.toString());
                        sockobj = obj;
                        exp.add(obj, sock);
                        console.log('[BrainServer] orders:' + data);
                        console.log('[BrainServer] list:', server);
                    }
                    //heart beat
                    if (obj.order == 'ping') {
                        if (obj.data == 'ping') {
                            var pingData = {
                                'order': 'ping',
                                'data': 'pong'
                            };
                            sock.write(JSON.stringify(pingData));
                        }
                    }


                });
            });

            sock.on('close', function() {
                exp.remove(sockobj, address + ':' + port);
                console.log('[BrainServer] ' + address + ':' + port + 'is closed');
                console.log('[BrainServer] list:', server);
            });

            sock.on('error', function(data) {
                console.error('brain error', data);
            });

        }).listen(appInfo.port, appInfo.ip);
        console.log('[BrainServer] start at ' + appInfo.ip + ':' + appInfo.port);
    };

})(brain);

brain();
