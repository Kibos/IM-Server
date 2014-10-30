'use strict';

var hash = require('../hash/hash.js');
var redisConnect = require('../../connect/redis');
var mongoConnect = require('../../connect/mongo');
var offline = require('./offline');
var id = require('../id');
var safe = require('./messageSafe');
var msgSave = require('./msgsave');
var config = require('../../conf/config');
var mg1 = config.mongodb.mg1;
var async = require('async');

// var logs = require('../logs/logs');

/**
 *   method person
 *   send preson message
 *   param options {Object}
 *   param options.user {Object}
 *   param options.callback {Object}
 *
 **/
exports.person = function(rec, socket, options) {

//    exports.sendToPerson(rec, rec.touser, rec.poster, socket);
//TODO develop
    safe.friend(rec.poster, rec.touser, rec.access_token, {
        'catch': options.user
    }, function(isSafe) {
        if (isSafe) {
            exports.sendToPerson(rec, rec.touser, rec.poster, socket);
        } else {
            rec.status = 100;
            rec.msg = '对方还不是你的好友，请添加好友之后再发送消息';
            if (socket) socket.emit('ybmp', rec);
        }
    });


};

//  send public message to personal
exports.sendToPerson = function(msg, touser, poster, socket) {
    var redisHost = hash.getHash('PRedis', touser);
    var room = 'Room.' + touser;

    //fix message 
    var time = +new Date();
    msg.time = msg.time || time;
    msg.messageId = id.id();

    //connect to the redis
    redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
        msg.status = 200;

        client.publish(room, JSON.stringify(msg));

        if (socket) socket.emit('ybmp', msg);

        client.sismember('online', touser, function(err, isOnline) {
            console.log('person-->', touser, 'isOnline', isOnline);
            if (!isOnline) {
                console.log(touser + ' is offline');
                //offline.setMsg(msg, touser, poster);
                offline.pushMessage(msg, touser, poster);
            }
        });

    });

    //save the message log & save the message statu
    var msgData = {
        'type': 0,
        'from': parseInt(msg.poster),
        'to': parseInt(msg.touser),
        'content': msg,
        'time': time,
        'messageId': msg.messageId
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
            //success
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_Person'});
    //save msg statu to mongodb
    msgSave.sta({
        'messageId': msg.messageId,
        'touser': [parseInt(msg.touser)],
        'poster': parseInt(msg.poster),
        'type': 0,
        'time': msg.time
    });
};


exports.group = function(rec, socket) {

    var groupServer = hash.getHash('GNode', rec.togroup);
    if (!groupServer) {
        console.log('can not find groupServer', rec.togroup, 'hash', hash._hash());
        return false;
    }
    var time = +new Date();
    rec.status = 200;
    rec.time = time;
    rec.messageId = id.id();
    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = 'Group.' + groupServer.id;

    //Common Platform privilege
    if (!(rec.action == 'sendSysMessageToGroup')) {
        async.waterfall([
            function(cb) {
                isChat(cb);
            }
        ], function (err, res) {
            if (err) {
                console.error('[msgsend][group] async isChat is false. err is ', err);
            }
            if (res) {
                sendGroupMessage();
            }
        });
    } else {
        var redisPort = config.sta.redis.cache.port;
        var redisIp = config.sta.redis.cache.ip;
        redisConnect.connect(redisPort, redisIp, function(client) {
            var groupKey = 'group:' + rec.togroup + ':users';
            client.hmset(groupKey, 'isChat', false, function(err, res) {
                if (err || res !== 'OK') {
                    console.error('[msgsend][group] hmset is false, err is ', err);
                }
                console.log('Settings can not talk success.');
            });
        });
        sendGroupMessage();
    }

    function isChat(callback) {
        var redisPort = config.sta.redis.cache.port;
        var redisIp = config.sta.redis.cache.ip;
        redisConnect.connect(redisPort, redisIp, function(client) {
            var groupKey = 'group:' + rec.togroup + ':users';
            client.HGET(groupKey, 'isChat', function(err, res) {
                if (err) {
                    console.error('[msgsend][group] HGET isChat false. err is ', err);
                    callback(err);
                }
                if (!JSON.parse(res)) {
                    rec.status = 100;
                    rec.msg = '此群组不可聊天，请与群组管理员联系';
                    if (socket) socket.emit('ybmp', rec);
                    callback(null, false);
                } else {
                    callback(null, true);
                }
            });
        });
    }

    function sendGroupMessage() {
        redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {

            console.log('group ready', groupRedis.port, groupRedis.ip, room);
            client.publish(room, JSON.stringify(rec));

            if (socket) socket.emit('ybmp', rec);
        });

        //log it to server (group msg)
        var msgData = {
            'type': 1,
            'from': parseInt(rec.poster),
            'to': parseInt(rec.togroup),
            'content': rec,
            'time': time,
            'messageId': rec.messageId
        };

        mongoConnect.connect(function(mongoC) {
            mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
                //Message insert success
            });
        }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_Group'});
    }
};

exports.sys = function(touser, msg) {
    if (!touser) {
        console.log('touser is necessary');
        return false;
    }
    msg.time = +new Date();
    msg.order = 'SYS';
    msg.messageId = id.id();
    msg.touser = touser;
    msg.poster = (msg.poster || 'SYS');
    var redisHost = hash.getHash('PRedis', touser);
    redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
        var room = 'Room.' + touser;

        client.publish(room, JSON.stringify(msg));

        client.sismember('online', touser, function(err, isOnline) {
            console.log('sys--->', touser, 'online:', isOnline, 'msg:', msg);
            if (!isOnline) {
                //offline.setMsg(msg, touser, 'SYS');
                offline.pushMessage(msg, touser, 'SYS');
            }
        });
    });

    var msgData = {
        'type': 2,
        'from': -999,
        'to': parseInt(touser),
        'content': msg,
        'time': msg.time,
        'messageId': msg.messageId
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
            //success
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'insert_Message_sys'});

    //save msg statu to mongodb
    msgSave.sta({
        'messageId': msg.messageId,
        'touser': [parseInt(touser)],
        'poster': -999,
        'type': 2,
        'time': msg.time
    });
};
//