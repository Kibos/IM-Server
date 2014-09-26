//Monitoring Communications

var redis = require('redis');

var PRedis = require('../conf/config').Server.PRedis;
var PredisArr = [];
for (i in PRedis) {
    PredisArr.push(PRedis[i]);
}

for (var i = 0; i < PredisArr.length; i++) {
    var redisClient = redis.createClient(PredisArr[i].port, PredisArr[i].ip);
    var room = PredisArr[i].ip;

    setInterval(function() {
        redisClient.publish(room, 'Monitoring message');
    }, 5000);
}
