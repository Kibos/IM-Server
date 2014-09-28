//Monitoring Communications

var redis = require('redis');
var fs = require('fs');
var PRedis = require('../conf/config').Server.PRedis;
var PNodes = require('../conf/config').NodeInfo;

var PredisArr = [];
var PNodesArr = [];
var room;
var roomArr = [];

for (i in PRedis) {
    PredisArr.push(PRedis[i]);
}

for (i in PNodes) {
    if (i.match('PNode')) PNodesArr.push(PNodes[i]);
}

var temp = {};

for (var j = 0; j < PNodesArr.length; j++) {
    for (var k = 0; k < PredisArr.length; k++) {
        var redisClient = redis.createClient(PredisArr[k].port, PredisArr[k].ip);
        roomArr.push('[' + PNodesArr[j].ip  + ':' + PNodesArr[j].port + '][' + PredisArr[k].ip  + ':' + PredisArr[k].port + ']');
        room = '[' + PNodesArr[j].ip  + ':' + PNodesArr[j].port + '][' + PredisArr[k].ip  + ':' + PredisArr[k].port + ']';
        temp[room] = {};
        temp[room].arr = [];
        temp[room].flag = 0;

        doSub(redisClient, room);
    }
}

function doSub(redisClient, room) {
    redisClient.subscribe(room);
    redisClient.on('message', function(room, message) {
        temp[room].flag = 1;
        console.log('received ' + message + ' from ' + room);
    });
}

setInterval(function() {
    for (var i = 0; i < roomArr.length; i++) {
        room = roomArr[i];
        temp[room].arr.push(temp[room].flag);
        if (temp[room].flag) temp[room].flag = 0;
    }
    //control arr size
    if (temp[room].arr.length > 1000) temp[room].arr = [];
}, 3000);

//var filename = '/usr/local/app/www/logs/monitoringLog.' + new Date().toJSON().split('T')[0] + '.txt';
var filename = './monitoringLog.' + new Date().toJSON().split('T')[0] + '.txt';

var json = {
    temp: temp,
    time: new Date()
};

setInterval(function() {
    fs.writeFile(filename, JSON.stringify(json) + '\n', {
        flag: 'a'
    }, function(err) {
        if (err) {
            console.log(err);
        }
    });
},1000);
