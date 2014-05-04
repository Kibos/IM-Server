var hash = require('../hash/hash.js');
var redisConnect = require('../redis/connect');
var offline = require('../msg/offline');
var mongoConnect = require('../mongodb/connect');
var id = require('../id/id');

exports.person = function(rec, socket, host, callback) {
    var redisHost = hash.getHash('PRedis', rec.touser);
    var text = rec.text;
    var room = "Room." + rec.touser;
    var time = +new Date();
    //connect to the redis
    redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
        rec.status = 200;
        rec.time = time;
        rec.messageId = id.id();
        console.log(client.publish(room, JSON.stringify(rec)));

        socket.emit('ybmp', rec);
        client.sismember('online', rec.touser, function(err, isOnline) {
            if (!isOnline) {
                console.log(rec.touser + 'is offline');
                offline.setMsg(rec);
            }
        });

    });

    //log it to server (psersonal msg) async
    var msgData = {
        "type": "0",
        "from": rec.poster,
        "to": rec.touser,
        "content": rec.text,
        "time": time,
        "messageId": rec.messageId
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db("larvel").collection('Message').insert(msgData, function() {
            //success
        });
    });
};

exports.group = function(rec, socket) {

    var groupServer = hash.getHash('GNode', rec.togroup);
    if (!groupServer) {
        return false;
    }
    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = "Group." + groupServer.id;
    var time = +new Date();

    redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
        rec.status = 200;
        rec.time = time;
        rec.messageId = id.id();
        client.publish(room, JSON.stringify(rec));

        socket.emit('ybmp', rec);
    });

    //log it to server (group msg)
    var msgData = {
        "type": "1",
        "from": rec.poster,
        "to": rec.togroup,
        "content": rec.text,
        "time": time,
        "messageId": rec.messageId
    };

    mongoConnect.connect(function(mongoC) {
        mongoC.db("larvel").collection('Message').insert(msgData, function() {
            //success
        });
    });
};