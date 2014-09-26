//Monitoring Communications

var redis = require('redis');
var fs = require('fs');

var PRedis = require('../conf/config').Server.PRedis;
var PredisArr = [];
for (i in PRedis) {
    PredisArr.push(PRedis[i]);
}

var temp = {};

for (var i = 0; i < PredisArr.length; i++) {
    var redisClient = redis.createClient(PredisArr[i].port, PredisArr[i].ip);
    var room = PredisArr[i].ip;
    temp[room] = [];

    redisClient.subscribe(room);
    redisClient.on('message', function(room, message) {
        temp[room].flag = 1;
        console.log('10.21.128.48 received ' + message + ' from ' + room);
    });
}

setInterval(function() {
    if (temp[room].flag == undefined) return;
    temp[room].push(temp[room].flag);
    temp[room].flag = 0;
}, 5000);

setInterval(function() {
    console.log('@#######temp:', temp);
    fs.writeFile('./logs.txt', temp + '\n' + (new Date()), {
        flag: 'a'
    }, function(err) {
        if (err) {
            console.log(err);
        }
        msg = 'received false';
    });
},60000);
