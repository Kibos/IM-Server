'use strict';

var mongoConnect = require('../mongodb/connect');
var conf = require('../../conf/config');

/**
 * setMsg to Offline
 * @param {[type]}   message
 * @param {[type]}   touser
 * @param {[type]}   poster
 * @param {[type]}   option
 * @param {Function} callback
 */
// exports.setMsg = function(message, touser, poster) {
//     var to = touser || message.touser || message.togroup;
//     poster = poster || message.poster;
//     var msgid = message.messageId;
//     if (!msgid || !to || !poster) {
//         return false;
//     }

//     mongoConnect.connect(function(MongoConn) {
//         //get the old message
//         var collection = MongoConn.db(conf.mongodb.mg1.dbname).collection('Offline');
//         var query = {
//             'touser': touser,
//             'poster': poster
//         };

//         collection.update(query, {
//             $push: {
//                 'messages': {
//                     $each: [msgid],
//                     $slice: -10
//                 }
//             },
//             $inc: {
//                 length: 1
//             }
//         }, {
//             upsert: true
//         }, function() {});

//     });
// };

/**
 * push message
 * @return {[type]}
 */
exports.pushMessage = function(message, touser, poster, option, callback) {

    if (!touser) {
        return false;
    }
    //offline push
    //message.username,message.groupname
    mongoConnect.connect(function(MongoConn) {
        var poster = poster || message.poster;

        //name
        var username = '易班';
        if (message.groupname) {
            username = message.groupname + (message.username ? '(' + message.username + ')' : '');
        } else if (message.username) {
            username = message.username;
        }

        //message
        var textMsg = '你收到了一条消息';
        if (message.noti_type) {
            if (message.noti_type == 'group') {
                textMsg = '发来一条[通知]';
            }
        } else if (message.text) {
            textMsg = message.text;
        } else if (message.image) {
            textMsg = '发来一张图片';
        }


        var text = username + ':' + textMsg;

        //message,to,poster

        MongoConn.db(conf.mongodb.mg1.dbname).collection('PushStack').insert({
            'toUser': touser,
            'groupId': message.togroup || null,
            'poster': poster,
            'msg': text,
            'content': message,
            'time': new Date()
        }, function() {
            if (callback) callback();
        });
    });
};




/**
 * get offlien message
 * @param  {[type]}   userid   [description]
 * @param  {Function} callback [description]
 * @return {Array}
 *  [{userid:123,
 *    msg:[{“msg消息体，参见个人/群组消息体”},
 *         {“msg消息体，参见个人/群组消息体”}],
 *    length:50
 *   },...]
 */
exports.getMsg = function(userid, callback) {

    var result = [];
    userid = parseInt(userid);
    //get the message

    //TEST NEW
    mongoConnect.connect(function(mongoC) {
        var MsgSta = mongoC.db(conf.mongodb.mg1.dbname).collection('MsgSta');
        //get use's array
        MsgSta.distinct('poster', {
            'touser': userid,
            'reach': false
        }, function(err, res) {

            if (err || res.length <= 0) {
                if (callback) callback([]);
            } else {
                topMessage(res, MsgSta);
            }
        });
    });

    /**
     * get everyone's message
     * @param  {Array} users the users
     * @return {Object} [description]
     *          [{userid:1006748,msg:[[Object],[Object]],length:2},..]
     */

    function topMessage(users, MsgSta) {
        var totalUser = users.length;
        var loadUser = 0;
        for (var i = 0; i < totalUser; i++) {
            get(users[i]);
        }

        function get(userid) {
            getTop(userid, MsgSta, function(messageArray, length) {
                var resultObj = {
                    'userid': userid,
                    'msg': messageArray,
                    'length': length
                };
                result.push(resultObj);
                if (++loadUser >= totalUser) {
                    if (callback) callback(result);
                }
            });
        }

    }


    function getTop(uid, MsgSta, callback) {
        var messages = [];
        var _ids = [];

        //TODO:find and delete
        var findSql = MsgSta.find({
            'touser': userid,
            'poster': uid,
            'reach': false
        }, {
            'messageId': true
        }).sort({
            '_id': -1
        });

        findSql.count(function(err, length) {
            if (err) {
                if (callback) callback([]);
            }

            findSql.limit(20).toArray(function(err, res) {
                for (var j = 0, len = res.length; j < len; j++) {
                    messages.push(res[j].messageId);
                    _ids.push(res[j]._id);
                }
                getRealMsg(messages, length, uid, callback);

                MsgSta.remove({
                    _id: {
                        $in: _ids
                    }
                }, function() {});

            });
        });

    }

    function getRealMsg(messageIds, length, uid, callback) {
        mongoConnect.connect(function(mongoC) {
            mongoC.db(conf.mongodb.mg1.dbname).collection('Message').find({
                'messageId': {
                    $in: messageIds
                }
            }, {
                'type': 0,
                '_id': 0
            }).toArray(function(err, res) {
                notificationCallback(res, uid, mongoC);
                if (callback) callback(res, length);
            });
        });
    }

    //TEST NEW

    function notificationCallback(messages, toUser, mongoC) {

        //get the notification then save to the message
        for (var i = 0, len = messages.length; i < len; i++) {
            var msg = messages[i].content;

            if (msg && (parseInt(msg.type) == 6 || parseInt(msg.type) == 7) && msg.msgid) {
                updateMongodb(msg, toUser, mongoC);
            }

        }

        function updateMongodb(msg, toUser, mongoC) {
            var pushObj = {};
            pushObj['groups.' + msg.togroup + '.hasrecieved'] = userid;

            var pullObj = {};
            pullObj['groups.' + msg.togroup + '.unrecieved'] = userid;

            var collection = mongoC.db(conf.mongodb.mg1.dbname).collection('Notices');
            collection.update({
                '_id': parseInt(msg.msgid)
            }, {
                //TODO:if need , don't forget pull out form the unreceived list
                $push: pushObj,
                $pull: pullObj
            }, function() {

            });
        }

    }
};