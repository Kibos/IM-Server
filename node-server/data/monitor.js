var redis = require('redis');

var PRedis = require('../../conf/config').Server.PRedis;
var PredisArr = [];
var count = 0;
var temp = {};

for (i in PRedis) {
    PredisArr.push(PRedis[i]);
}

function MonitorSub(appInfo) {
    //Monitoring Communications (subscribe)
    var roomLocal = appInfo.ip  + ':' + appInfo.port;

    for (var j = 0; j < PredisArr.length; j++) {
        var redisClient = redis.createClient(PredisArr[j].port, PredisArr[j].ip);
        var roomRedis = PredisArr[j].ip  + ':' + PredisArr[j].port;
        var room = roomLocal + '/' + roomRedis;
        doSub(redisClient, room);
        temp[roomLocal] = {};
        temp[roomLocal][roomRedis] = false;
    }

    function doSub(redisClient, room) {
        redisClient.subscribe(room);
        redisClient.on('message', function(room, message) {
            count ++;
            var arr = room.split('/', 2);
            temp[arr[0]][arr[1]] = true;
            console.log('received ' + message + ' from ' + room);
        });
    }

}

function MonitorPub(res, NodeInfo) {
    var ip = NodeInfo.ip;
    var port = NodeInfo.port;

    for (var k = 0; k < PredisArr.length; k++) {
        doPub(k);
    }

    function doPub(k) {
        var redisClient = redis.createClient(PredisArr[k].port, PredisArr[k].ip);
        var room = ip  + ':' + port + '/' + PredisArr[k].ip  + ':' + PredisArr[k].port;
        redisClient.publish(room, 'Monitoring message');
    }

    var id = setTimeout(function() {
        res.end(JSON.stringify(temp));
    }, 1000);
    if (count === PredisArr.length) {
        clearTimeout(id);
        res.end(JSON.stringify(temp));
    }
}
exports.MonitorSub = MonitorSub;
exports.MonitorPub = MonitorPub;