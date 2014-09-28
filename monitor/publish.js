//Monitoring Communications

var redis = require('redis');
var PRedis = require('../conf/config').Server.PRedis;
var appInfo = require('../conf/config.js').NodeInfo.PNode;

var PredisArr = [];
var room;

for (i in PRedis) {
    PredisArr.push(PRedis[i]);
}

function doPublish() {
    for (var k = 0; k < PredisArr.length; k++) {
        var redisClient = redis.createClient(PredisArr[k].port, PredisArr[k].ip);
        room = '[' + appInfo.ip  + ':' + appInfo.port + '][' + PredisArr[k].ip  + ':' + PredisArr[k].port + ']';
        doPub(redisClient, room);
    }
}

function doPub(redisClient, room) {
    redisClient.publish(room, 'Monitoring message');
}

exports.doPublish = doPublish;