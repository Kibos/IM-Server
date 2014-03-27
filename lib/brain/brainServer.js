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
        var socketName = sock.remoteAddress + ':' + sock.remotePort;
        socketList[socketName] = {
            "socket" : sock,
            "info" : obj
        };
        obj.hash = JSON.stringify(server);
        exp.push(obj, socketName);
    };
    
    exp.get = function(){
        
    }

    exp.remove = function(obj, socketName) {
        if(!obj){
            return false;
        }
        if (server[obj.type]) {
            delete server[obj.type][obj.id];
        }
        delete socketList[socketName];
        obj.order = 'remove';
        exp.push(obj, socketName);
    };

    exp.scan = function() {

    };

    exp.push = function(obj, socketName) {
        for (var i in socketList) {
            if (i == socketName) {
                obj.self = true;
            }
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
                }
                
                console.log('[brain] add:'+data);
                console.log('[brain] list:', server);
            });

            sock.on('close', function(data) {
                console.log(sockobj)
                exp.remove(sockobj, address + ':' + port);
            });

        }).listen(port, ip);
        console.log('[brain] start at ' + ip + ':' + port);
    };

})(brain);

brain();
