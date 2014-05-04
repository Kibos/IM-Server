var net = require('net');


exports.createServer = function(port, ip) {
    if (!port) return false;

    net.createServer(function(sock) {

        scok.on('connect', function(data) {
            console.log(data)
        });

        sock.on('data', function(data) {
            console.log(data)
        });

        sock.on('close', function(data) {
            console.log(data)
        });

    }).listen(port, ip, function() {
        console.log('server start at ' + ip + ':' + port)
    });

};

exports.createServer(5544, '127.0.0.1')