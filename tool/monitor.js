var redis = require('redis');
var PRedis = require('../conf/config').Server.PRedis;
var redisPwd = require('../conf/config').redisPwd;
var exec = require('child_process').exec;

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

        doSub(ip, port);
    }

    function doSub(ip, port) {
        var redisClient = redis.createClient(port, ip);
        var roomRedis = ip  + ':' + port;
        var channel1 = roomLocal + ' <=> ' + roomRedis;
        var channel2 = roomRedis + ' <=> ' + roomLocal;

        if (redisPwd[ip]) {
            redisClient.auth(redisPwd[ip]);
        }

        redisClient.subscribe(channel1);
        redisClient.on('message', function(room, message) {
            port = room.split(' <=> ', 2)[1].split(':', 2)[1];
            ip = room.split(' <=> ', 2)[1].split(':', 2)[0];

            var publisher = redis.createClient(port, ip);
            if (redisPwd[ip]) {
                publisher.auth(redisPwd[ip]);
            }
            publisher.publish(channel2, message + ' is received, cost time ');
            console.log('received message', message);
        });
    }
}

function MonitorPub(res, NodeInfo) {
    //Monitoring Communications (publish)
    var roomLocal = NodeInfo.ip  + ':' + NodeInfo.port;
    var filename = NodeInfo.ip + '_' + NodeInfo.port + '_pn_' + new Date().toJSON().split('T')[0] + '.txt';
    var cmd = "cd /usr/local/app/www/logs;sed -n '$p' " + filename;
    var ip, port;
    var temp = {
        'nodeToRedis': [],
        'onlineInfo': null
    };
    var time = {};

    for (var k = 0; k < PredisArr.length; k++) {
        ip = PredisArr[k].ip;
        port = PredisArr[k].port;

        doPub(ip, port);
    }

    function doPub(ip, port) {
        var redisClient = redis.createClient(port, ip);
        var roomRedis = ip  + ':' + port;
        var channel1 = roomLocal + ' <=> ' + roomRedis;
        var channel2 = roomRedis + ' <=> ' + roomLocal;

        if (redisPwd[ip]) {
            redisClient.auth(redisPwd[ip]);
        }

        time.start = +new Date();

        redisClient.publish(channel1, channel1);
        redisClient.subscribe(channel2);
        redisClient.on('message', function(room, message) {
            console.log(message);

            time.end = +new Date();
            var costTime = {};
            costTime[message] = time.end - time.start;
            temp.nodeToRedis.push(costTime);

            redisClient.unsubscribe(channel2);
            delete redisClient;
            delete costTime;
        });
    }

    exec(cmd, function(err, out, code) {
        if (err) {
            console.error('exec is falsed. err is ', code);
            return false;
        }
        temp.onlineInfo = JSON.parse(out);
    });

	setTimeout(function(){
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(temp));
	}, 500);
}

exports.MonitorSub = MonitorSub;
exports.MonitorPub = MonitorPub;
