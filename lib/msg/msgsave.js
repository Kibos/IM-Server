'use strict';

var conf = require('../../conf/config');
var mongoConnect = require('../mongodb/connect');
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
exports.sta = function(obj, callback) {
    if (!obj.messageId || !obj.touser || !obj.poster) {
        return false;
    }
    var msgData = {
        'messageId': obj.messageId,
        'poster': parseInt(obj.poster),
        //'reach': false,
        //'read': false,
        'type': obj.type || 0,
        'time': obj.time || (+new Date())
    };
    if (Array.isArray(obj.touser)) {
        msgData.unreach = obj.touser;
    } else {
        // msgData.touser = parseInt(obj.touser);
        console.log('[msgsave.js] wrong type if obj.touser')
        return false;
    }

    mongoConnect.connect(function(mongoC) {
        mongoC.db(conf.mongodb.mg1.dbname).collection('MsgSta').insert(msgData, function() {
            if (callback) callback(arguments);
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
 *      msgsave.staMark('12324',{userid:1234});
 */
exports.staMark = function(messageId, options, callback) {
    if (!messageId || !options) {
        return false;
    }
    messageId = messageId.split(',');
    var sql = {
        messageId: {
            $in: messageId
        }
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db(conf.mongodb.mg1.dbname).collection('MsgSta').update(sql, {
            $pull: {
                unreach: parseInt(options.userid)
            }
        }, {
            multi: true
        }, function() {
            if (callback) callback();
        });
    });
};