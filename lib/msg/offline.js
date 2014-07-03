'use strict';

var mongoConnect = require('../mongodb/connect');

/**
 * setMsg to Offline
 * @param {[type]}   message
 * @param {[type]}   touser
 * @param {[type]}   poster
 * @param {[type]}   option
 * @param {Function} callback
 */
exports.setMsg = function(message, touser, poster) {
    var to = touser || message.touser || message.togroup;
    poster = poster || message.poster;
    var msgid = message.messageId;
    if (!msgid || !to || !poster) {
        return false;
    }

    mongoConnect.connect(function(MongoConn) {
        //get the old message
        var collection = MongoConn.db('larvel').collection('Offline');
        var query = {
            'touser': touser,
            'poster': poster
        };

        collection.update(query, {
            $push: {
                'messages': {
                    $each: [msgid],
                    $slice: -10
                }
            },
            $inc: {
                length: 1
            }
        }, {
            upsert: true
        }, function() {});

    });


};

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
        var username = message.username ? message.username + ':' : '';

        var textMsg = message.text || '易班:你收到了一条消息';
        var text = username + textMsg;

        //message,to,poster

        MongoConn.db('larvel').collection('PushStack').insert({
            'toUser': touser,
            'groupId': message.togroup || null,
            'poster': poster,
            'msg': text,
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
        var MsgSta = mongoC.db('larvel').collection('MsgSta');
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

        //TODO:find and delete
        var findSql = MsgSta.find({
            'touser': userid,
            'poster': uid,
            'reach': false
        }, {
            'messageId': true,
            '_id': false
        }).sort({
            '_id': -1
        });

        findSql.count(function(err, length) {
            if (err) {
                if (callback) callback([]);
            }

            findSql.limit(10).toArray(function(err, res) {
                for (var j = 0, len = res.length; j < len; j++) {
                    messages.push(res[j].messageId);
                }
                getRealMsg(messages, length, uid, callback);
                MsgSta.remove({
                    messageId: {
                        $in: messages
                    }
                }, function() {});
            });
        });

    }

    function getRealMsg(messageIds, length, uid, callback) {
        mongoConnect.connect(function(mongoC) {
            mongoC.db('larvel').collection('Message').find({
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

            if ((msg.type == '6' || msg.type == '7') && msg.msgId) {
                updateMongodb(msg, toUser, mongoC);
            }
        }

        function updateMongodb(msg, toUser, mongoC) {
            var pushObj = {};
            pushObj['groups.' + msg.togroup + '.hasrecieved'] = toUser;

            var collection = mongoC.db('larvel').collection('Notices');
            collection.update({
                '_id': parseInt(msg.msgId)
            }, {
                //TODO:if need , don't forget pull out form the unreceived list
                $push: pushObj
            }, function() {

            });
        }

    }




    // mongoConnect.connect(function(mongoC) {
    //     var offMsg = {};

    //     mongoC.db('larvel').collection('Offline').find({
    //         'touser': userid
    //     }).toArray(function(err, result) {
    //         var totalUser = 0;
    //         var loadUser = 0;
    //         for (var i in result) {
    //             var users = result[i].poster;
    //             var msgLen = result[i].length;
    //             offMsg[users] = {};
    //             offMsg[users].msg = [];
    //             offMsg[users].length = msgLen;

    //             totalUser++;
    //             var messages = result[i].messages;
    //             for (var j = 0, len = messages.length; j < len; j++) {
    //                 if (messages[j]) {
    //                     offMsg[users].msg.push(messages[j]);
    //                 }
    //             }
    //         }

    //         mongoC.db('larvel').collection('Offline').remove({
    //             'touser': userid
    //         }, function() {});

    //         for (i in offMsg) {
    //             getRealMsg(i, offMsg[i].msg);
    //         }

    //         function getRealMsg(user, messageId) {
    //             mongoC.db('larvel').collection('Message').find({
    //                 'messageId': {
    //                     $in: messageId
    //                 }
    //             }, {
    //                 'type': 0,
    //                 '_id': 0
    //             }).toArray(function(err, res) {
    //                 saveMsg(user, res);
    //             });
    //         }

    //         var offMsgFormat = [];

    //         function saveMsg(user, msg) {
    //             loadUser++;

    //             var temDate = {};
    //             temDate.userid = user;
    //             temDate.msg = msg;
    //             temDate.length = offMsg[user].length;

    //             offMsgFormat.push(temDate);

    //             notificationCallback(temDate.msg, user);
    //             //offMsg[user]['msg'] = msg;
    //             if (loadUser >= totalUser) {
    //                 if (callback) callback(offMsgFormat);
    //             }
    //         }



    //     });
    // });
};