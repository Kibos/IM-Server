var net = require('net');

var scoketPool = {};

exports.connect = function(port, ip, callback) {
    console.log('.......',scoketPool,port, ip)
    var name = port + ip;
    scoketPool[name] = scoketPool[name] || {};
    if (scoketPool[name].sta == 'ok') {
        if (callback) callback(scoketPool[name].socket);
    } else {
        scoketPool[name].stack = scoketPool[name].stack || [];
        scoketPool[name].stack.push(callback);
        if (scoketPool[name].sta !== 'ing') {
            scoketPool[name].sta = 'ing';

            var client = new net.Socket();

            client.connect(port, ip);
            client.on('connect', function() {
                scoketPool[name].socket = client;
                scoketPool[name].sta = 'ok';
                while (scoketPool[name].stack.length > 0) {
                    scoketPool[name].stack.shift()(client);
                }
            });

            client.on('data', function() {

            });

            client.on('close', function() {
                console.log(arguments)
                delete scoketPool[name];
            });

            client.on('error', function() {
                console.log('err',arguments)
                delete scoketPool[name];
            });
        }
    }
};