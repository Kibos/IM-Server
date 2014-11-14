'use strict';

var mg2 = require('../../conf/config').mongodb.mg2;
var mongoConnect = require('../../connect/mongo');

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
        if (callback) callback('[msgsave][sta]obj is necessary');
        return false;
    }
    var msgData = {
        'messageId': obj.messageId,
        'poster': parseInt(obj.poster),
        'type': obj.type || 0,
        'time': obj.time || (+new Date())
    };
    if (Array.isArray(obj.touser)) {
        msgData.unreach = obj.touser;
    } else {
        console.error('[msgsave.js] wrong type if obj.touser');
        if (callback) callback('[msgsave][sta]obj touser type is unnormal.');
        return false;
    }

    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg2.dbname).collection('MsgSta').insert(msgData, function(err) {
            if (err) {
                console.error('[msgsave][insert] is false. err is ', err);
                if (callback) callback(err);
            }
            if (callback) callback(null);
        });
    }, {ip: mg2.ip, port: mg2.port, name: 'insert_MsgSta_save'});
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
        mongoC.db(mg2.dbname).collection('MsgSta').update(sql, {
            $pull: {
                unreach: parseInt(options.userid)
            }
        }, {
            multi: true
        }, function() {
            if (callback) callback();
        });
    }, {ip: mg2.ip, port: mg2.port, name: 'update_MsgSta_mark'});
};