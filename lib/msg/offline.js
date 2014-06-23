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



exports.getMsg = function(userid, callback) {
    //get the message
    mongoConnect.connect(function(mongoC) {
        var offMsg = {};

        mongoC.db('larvel').collection('Offline').find({
            'touser': userid
        }).toArray(function(err, result) {
            var totalUser = 0;
            var loadUser = 0;
            for (var i in result) {
                var users = result[i].poster;
                var msgLen = result[i].length;
                offMsg[users] = {};
                offMsg[users].msg = [];
                offMsg[users].length = msgLen;

                totalUser++;
                var messages = result[i].messages;
                for (var j = 0, len = messages.length; j < len; j++) {
                    if (messages[j]) {
                        offMsg[users].msg.push(messages[j]);
                    }
                }
            }

            // mongoC.db('larvel').collection('Offline').remove({
            //     'touser': userid
            // }, function() {});

            for (i in offMsg) {
                getRealMsg(i, offMsg[i].msg);
            }

            function getRealMsg(user, messageId) {
                mongoC.db('larvel').collection('Message').find({
                    'messageId': {
                        $in: messageId
                    }
                }, {
                    'type': 0,
                    '_id': 0
                }).toArray(function(err, res) {
                    saveMsg(user, res);
                });
            }



            function saveMsg(user, msg) {
                loadUser++;

                var temDate = {};
                temDate.userid = user;
                temDate.msg = msg;
                temDate.length = offMsg[user].length;

                notificationCallback(temDate.msg, user);
                //offMsg[user]['msg'] = msg;
                if (loadUser >= totalUser) {
                    if (callback) callback(temDate);
                }
            }

            function notificationCallback(messages, toUser) {
                //get the notification then save to the message
                for (var i = 0, len = messages.length; i < len; i++) {
                    var msg = messages[i].content;

                    if ((msg.type == '6' || msg.type == '7') && msg.msgId) {

                        var pushObj = {};
                        pushObj['groups.' + msg.togroup + '.hasrecieved'] = toUser

                        var collection = mongoC.db('larvel').collection('Notices');
                        collection.update({
                            '_id': parseInt(msg.msgId)
                        }, {
                            $push: pushObj,
                        }, function(err, res) {

                        });

                    }
                }

            }

        });
    });
};