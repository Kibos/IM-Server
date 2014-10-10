var redis = require('redis');
var PRedis = require('../conf/config').Server.PRedis;
var redisPwd = require('../conf/config').redisPwd;

var PredisArr = [];

for (i in PRedis) {
    PredisArr.push(PRedis[i]);
}

function MonitorSub(appInfo) {
    //Monitoring Communications (subscribe)
    var roomLocal = appInfo.ip  + ':' + appInfo.port;
    var ip, port;

    for (var j = 0; j < PredisArr.length; j++) {
        ip = PredisArr[j].ip;
        port = PredisArr[j].port;

        var redisClient = redis.createClient(port, ip);
        var roomRedis = ip  + ':' + port;
        var channel1 = roomLocal + ' -> ' + roomRedis;
        var channel2 = roomRedis + ' -> ' + roomLocal;

        if (redisPwd[ip]) {
            redisClient.auth(redisPwd[ip]);
        }

        redisClient.subscribe(channel1);
        redisClient.on('message', function(room, message) {
            var publisher = redis.createClient(port, ip);
            publisher.publish(channel2, message + ' received');
        });

    }
}

function MonitorPub(res, NodeInfo) {
    //Monitoring Communications (publish)
    var roomLocal = NodeInfo.ip  + ':' + NodeInfo.port;
    var ip, port;

    for (var k = 0; k < PredisArr.length; k++) {
        ip = PredisArr[k].ip;
        port = PredisArr[k].port;

        var redisClient = redis.createClient(port, ip);
        var roomRedis = ip  + ':' + port;
        var channel1 = roomLocal + ' -> ' + roomRedis;
        var channel2 = roomRedis + ' -> ' + roomLocal;

        if (redisPwd[ip]) {
            redisClient.auth(redisPwd[ip]);
        }
        redisClient.publish(channel1, channel1);
        redisClient.subscribe(channel2);
        redisClient.on('message', function(room, message) {
            console.log(message);
            res.end(message);
            redisClient.unsubscribe(channel2);
        });
    }
}

exports.MonitorSub = MonitorSub;
exports.MonitorPub = MonitorPub;