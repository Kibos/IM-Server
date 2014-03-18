var net = require('net');
var port = 4999;
var ip = require('os').networkInterfaces()['eth0'][0].address;
var server = {}
var brain = function() {
    return brain['init'].apply(this, arguments)
};

(function(exp) {
    var socketList = {};

    exp.init = function() {
        exp.server();
    };

    exp.add = function(obj, sock) {
        server[obj.type] = server[obj.type] || {}
        server[obj.type][obj.id] = {
            'ip' : obj.ip,
            'port' : obj.port
        }
        var socketName = obj.id + '-' + sock.remoteAddress + ':' + sock.remotePort;
        socketList[socketName] = {
            "socket" : sock,
            "info" : obj
        };
        obj.hash = JSON.stringify(server);
        exp.push(obj);
    };

    exp.remove = function(obj, socketName) {
        delete server[obj.type][obj.id];
        delete socketList[socketName];
        obj.order = 'remove';
        exp.push(obj);
    };

    exp.scan = function() {

    };

    exp.push = function(obj) {
        for (var i in socketList) {
            socketList[i]['socket'].write(JSON.stringify(obj));
        }
    };

    exp.server = function() {
        net.createServer(function(sock) {
            var address, port, sockobj;

            address = sock.remoteAddress;
            port = sock.remotePort;

            sock.on('data', function(data) {

                var dataStr = data.toString();
                var obj = JSON.parse(dataStr);

                if (obj.order == 'add') {
                    sockobj = obj;
                    exp.add(obj, sock);
                } else if (obj.order == 'hashList') {
                    var data = {
                        "order" : 'hashList',
                        "data" : JSON.stringify(server)
                    }
                    sock.write(JSON.stringify(data));
                }
            });

            sock.on('close', function(data) {
                exp.remove(sockobj, sockobj.id + '-' + address + ':' + port);
            });

        }).listen(port, ip);
        console.log('brain is start at ' + ip + ':' + port);
    };

})(brain);

brain();
