var hash = require('../hash/hash.js');
var redisConnect = require('../redis/connect');
var offline = require('../msg/offline');
var mongoConnect = require('../mongodb/connect');
var id = require('../id/id');
var safe = require('./messageSafe');

/**
 *   method person
 *   send preson message
 *   param options {Object}
 *   param options.user {Object}
 *   param options.callback {Object}
 *
 **/
exports.person = function(rec, socket, options) {
    console.log('person-->', rec);
    var time = +new Date();

    safe.friend(rec.poster, rec.touser, rec.access_token, {
        "catch": options.user
    }, function(isSafe) {
        if (isSafe) {
            postAndSvae()
        } else {
            rec.status = 100;
            rec.msg = '对方还不是你的好友，请添加好友之后再发送消息';
            if(socket) socket.emit('ybmp', rec);
        }
    });

    function postAndSvae() {
        var redisHost = hash.getHash('PRedis', rec.touser);
        var text = rec.text;
        var room = "Room." + rec.touser;

        //connect to the redis
        redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
            console.log('person-->', 'redisok');
            rec.status = 200;
            rec.time = time;
            rec.messageId = id.id();
            client.publish(room, JSON.stringify(rec));

            if(socket) socket.emit('ybmp', rec);
            client.sismember('online', rec.touser, function(err, isOnline) {
                console.log('person-->', rec.touser, 'isOnline', isOnline);
                if (!isOnline) {
                    console.log(rec.touser + 'is offline');
                    offline.setMsg(rec, rec.touser, rec.poster);
                }
            });

        });
    };
    //log it to server (psersonal msg) async
    var msgData = {
        "type": "0",
        "from": rec.poster,
        "to": rec.touser,
        "content": rec,
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
        console.log('can not find groupServer')
        return false;
    }
    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = "Group." + groupServer.id;
    var time = +new Date();

    redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
        rec.status = 200;
        rec.time = time;
        rec.messageId = id.id();
        console.log('group ready', groupRedis.port, groupRedis.ip, room)
        client.publish(room, JSON.stringify(rec));

        if (socket) socket.emit('ybmp', rec);
    });

    //log it to server (group msg)
    var msgData = {
        "type": "1",
        "from": rec.poster,
        "to": rec.togroup,
        "content": rec,
        "time": time,
        "messageId": rec.messageId
    };

    mongoConnect.connect(function(mongoC) {
        mongoC.db("larvel").collection('Message').insert(msgData, function() {
            //success
        });
    });
};

exports.sys = function(touser, msg) {
    if (!touser) {
        console.log('touser is necessary')
        return false;
    }
    msg.time = +new Date();
    msg.order = 'SYS';
    msg.messageId = id.id();
    msg.touser = touser;
    msg.poster = (msg.poster||'SYS');
    var redisHost = hash.getHash('PRedis', touser);
    redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
        var room = "Room." + touser;

        client.publish(room, JSON.stringify(msg));

        client.sismember('online', touser, function(err, isOnline) {
            //console.log('sys--->',touser,isOnline,msg)
            if (!isOnline) {
                offline.setMsg(msg, touser, 'SYS');
            }
        });
    });

    var msgData = {
        "type": "0",
        "from": "SYS",
        "to": touser,
        "content": msg,
        "time": msg.time,
        "messageId": msg.messageId
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db("larvel").collection('Message').insert(msgData, function() {
            //success
        });
    });
};
//