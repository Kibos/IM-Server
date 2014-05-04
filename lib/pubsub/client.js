var net = require('net');

var connPool = {};

exports.sub = function(port, id, channel, callback) {
    var name = port + id;
    if (connPool) {} else {
        var client = new net.Socket();
        client.connect({
            host: 'id',
            port: port
        });
        client.on('error',function(){
            console.log('connect error');
        })

    }
};

exports.sub(5544, '127.0.0.1', '123', function() {

});