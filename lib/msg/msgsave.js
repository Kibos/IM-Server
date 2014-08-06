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
        'touser': parseInt(obj.touser),
        'poster': parseInt(obj.poster),
        'reach': false,
        'read': false,
        'type': obj.type || 0,
        'time': obj.time || (+new Date())
    };
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
 * @oaram  {String}   options.type[read,reach]
 * @param  {Bool}     options.value[true|false]
 * @param  {Number}   options.userid
 * @param  {Function} callback
 * @example
 *      msgsave.staMark('12324',{type:'read',value:true});
 */
exports.staMark = function(messageId, options, callback) {
    if (!messageId || !options) {
        return false;
    }
    if (options.type !== 'read' && options.type !== 'reach') {
        return false;
    }

    var data = {};
    data[options.type] = options.value || true;

    var sql = {};
    sql.messageId = messageId;
    if (options.userid) sql.touser = parseInt(options.userid);
    mongoConnect.connect(function(mongoC) {
        mongoC.db(conf.mongodb.mg1.dbname).collection('MsgSta').update(sql, {
            $set: data
        }, {
            multi: true
        }, function() {
            if (callback) callback();
        });
    });
};