var redis = require('redis');

var redisPool = {};

function connect(port, ip, callback) {
    var cid = port.toString() + ip.toString();
    redisPool[cid] = redisPool[cid] || {};
    if (redisPool[cid]['sta'] == 'ok') {
        callback && callback(redisPool[cid]['client']);
    } else {
        if (redisPool[cid]['sta'] == 'progress') {
            redisPool['stack'] = redisPool['stack'] || [];
            redisPool['stack'].push(callback);
        } else {
            redisPool[cid]['sta'] = 'progress';
            redisPool['stack'] = redisPool['stack'] || [];
            redisPool['stack'].push(callback);
            var client = redis.createClient(port, ip);
            client.on("ready", function() {
                redisPool[cid]['sta'] = 'ok';
                redisPool[cid]['client'] = client;
                //do all the callback
                for (var i = 0; i < redisPool['stack'].length; i++) {
                    redisPool['stack'][i](client);
                }
                redisPool['stack'] = [];
            });
        };
    }
}

exports.connect = connect; 