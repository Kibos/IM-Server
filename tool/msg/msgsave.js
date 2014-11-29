'use strict';

var config = require('../../conf/config');
var redisConnect = require('../../connect/redis');
var msgStaInfo = config.Server.MRedis;

/**
 * save the message status to mongodb
 * @param  {Object}     obj
 * @param  {String}     obj.messageId message id
 * @param  {Number}     obj.touser the target user id
 * @param  {Number}     obj.poster the host use if
 * @param  {String}     obj.type the message's type [personage|group]
 * @param  {Timestamp}  obj.time time stamp
 * @param  {Function}   callback
 */

exports.sta = function (obj, callback) {
    if (!obj.messageId || !obj.touser || !obj.poster || !obj.type) {
        if (callback) callback('[msgsave][sta] obj is necessary');
        return false;
    }

    var redisIp, redisPort;
    if (obj.type == 1 || obj.type == 6) {
        //TODO group
        redisIp = msgStaInfo.pr2.ip;
        redisPort = msgStaInfo.pr2.port;
    } else if (obj.type == 0 || obj.type == 2 || obj.type == 7) {
        redisIp = msgStaInfo.pr1.ip;
        redisPort = msgStaInfo.pr1.port;
    } else {
        console.log('msgsave sta type is unnormal, type is ', obj.type);
    }

    redisConnect.connect(redisPort, redisIp, function (client) {
        var key = obj.poster + ':' + obj.touser;
        client.ZADD(key, 1, obj.messageId, function (err, res) {
            if (err) {
                console.error('[msgsave][staPerson] HMSET is false. err is ', err);
                if (callback) callback(err);
            }
            console.log('poster:touser', key, 'LPUSH result is ', res);
            if (callback) callback(null);
        });
    });
};

/**
 * mark the statu
 * @param  {String}   messageId
 * @param  {Object}   options
 * @param  {Number}   options.userid
 * @param  {Function} callback
 * @example
 *      msgsave.staMark('12324',{type:'read',value:true});
 */

exports.staMark = function (msg) {
    if (!msg.messageId || !msg.poster || !msg.userid) {
        console.log('messageId, poster, userid is necessary.');
        return false;
    }

    var redisIp, redisPort;
    if (msg.type == 1 || msg.type == 6) {
        //TODO group
        redisIp = msgStaInfo.pr2.ip;
        redisPort = msgStaInfo.pr2.port;
    } else if (msg.type == 0 || msg.type == 2 || msg.type == 7) {
        redisIp = msgStaInfo.pr1.ip;
        redisPort = msgStaInfo.pr1.port;
    } else {
        console.log('msgsave staMark type is unnormal, type is ', msg.type);
    }

    redisConnect.connect(redisPort, redisIp, function (client) {
        var key = msg.poster + ':' + msg.userid;
        client.ZREM(key, msg.messageId, function (err, res) {
            if (err) {
                console.error('[msgsave][staPerson] HMSET is false. err is ', err);
            }
            console.log('poster:touser', key, 'ZREM result is ', res);
        });
    });
};
