'use strict';
var mongoConnect = require('../../connect/mongo');
var mongodb = require('../../conf/config').mongodb;

var mg1 = mongodb.mg1;
var mg2 = mongodb.mg2;
var mg3 = mongodb.mg3;


/**
 * push message
 * all the offline message going here
 * @return {[type]}
 */
exports.pushMessage = function(message, touser, poster, option, callback) {
    if (!touser) {
        return false;
    }
    //deal with the message push , the touser can be like this 1,2,3 (multi)
    var toUserArray = touser.toString().split(',').map(function(item) {
        return parseInt(item, 10);
    });

    //message.username,message.groupname
    mongoConnect.connect(function(MongoConn) {
        var poster = poster || message.poster;
        var username = '易班';
        var textMsg = '你收到了一条消息';
        var text = '';
        //abandon system message
        if (poster == 'SYS') {
            //request join a group
            if (message.noti_type == 'group' && message.action == 'request') {
                //wiki http://10.21.118.240/wiki/doku.php?id=ybmp#群组请求
                text = message.hostname + '申请加入' + message.groupname;
            } else {
                return false;
            }
        } else {
            //name
            if (message.groupname) {
                username = message.groupname + (message.username ? '(' + message.username + ')' : '');
            } else if (message.username) {
                username = message.username;
            }

            //message
            if (message.noti_type) {
                if (message.noti_type == 'group' || parseInt(message.type) == 6) {
                    textMsg = '发来一条[通知]';
                }
            } else if (message.text) {
                textMsg = message.text;
            } else if (message.image) {
                textMsg = '发来一张[图片]';
            }
            text = username + ': ' + textMsg;
        }
        var pushCache = MongoConn.db(mg2.dbname).collection('PushCache');
        var pushStack = MongoConn.db(mg2.dbname).collection('PushStack');
        //get the total number and save to the redis stack
        pushCache.find({
            'touser': {
                $in: toUserArray
            }
        }).toArray(function(err, res) {

            if (err) {
                console.log('[msgsend][offline] push Cache false');
                return false;
            }
            var temp = {};
            var counts = [];
            for (var i = 0, len = res.length; i < len; i++) {
                var userid = res[i].touser;
                var total = res[i].total;
                temp[userid] = total;
            }
            for (i = 0, len = toUserArray.length; i < len; i++) {
                var count = temp[toUserArray[i]] || 0;
                counts.push(++count);
                //update the pushCache's count
                pushUpdate(toUserArray[i]);
            }

            // var total = res[0] ? res[0].total : '0';
            // total = parseInt(total) + 1;
            //save to mongodb

            var StackObj = {
                'toUser': toUserArray.join(','),
                'groupId': parseInt(message.togroup) || null,
                'poster': parseInt(poster),
                'msg': text,
                'content': message,
                'time': new Date(),
                'count': counts.join(',')
            };
            pushStack.insert(StackObj, function(err) {
                if (err) {
                    console.log("[offline][pushMessage] insert false");
                    return false;
                }
                if (callback) callback();
            });
        });

        function pushUpdate(uid) {
            pushCache.update({
                'touser': parseInt(uid)
            }, {
                $inc: {
                    'total': 1
                }
            }, {
                'upsert': true
            }, function(err) {
                if (err) {
                    console.log("[offline][pushMessage] update false");
                    return false;
                }
            });
        }
    }, {ip: mg2.ip, port: mg2.port, name: 'offline_pushMessage'});

    //deal with the message push , the touser can be like this 1,2,3 (multi)
    for (var i = 0, len = toUserArray.length; i < len; i++) {
        //save to offline
        exports.offlineSave(message, toUserArray[i], poster);
    }
};

/**
 * save to offline
 * @param {[type]} [varname] [description]
 */
exports.offlineSave = function(message, touser, poster, option, callback) {

    mongoConnect.connect(function(mongoC) {
        var Offline = mongoC.db(mg1.dbname).collection('Offline');
        var updateSql = {};
        updateSql.$push = {};
        updateSql.$inc = {};
        updateSql.$push[poster + '.messages'] = {
            $each: [message.messageId],
            $slice: -20
        };
        updateSql.$inc[poster + '.total'] = 1;

        Offline.update({
            'userid': parseInt(touser)
        }, updateSql, {
            upsert: true
        }, function(err, res) {
            if (err) {
                console.log("[offline][offlineSave] update false");
                return false;
            }
            // console.log(err, res);
            if (callback) callback(err, res);

        });
    }, {ip: mg1.ip, port: mg1.port, name: 'update_offline_save'});
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
    userid = parseInt(userid);
    var result = [];
    var totalUser = 0;
    var loadUser = 0;
    mongoConnect.connect(function(mongoC) {
        var Offline = mongoC.db(mg1.dbname).collection('Offline');
        Offline.find({
            'userid': userid
        }).toArray(function(err, res) {
            if (err || res.length <= 0) {
                if (callback) callback(result);
            } else {
                for (var i in res[0]) {
                    if (!res[0][i].total || !res[0][i].messages) continue;
                    getByPerson(i, res[0][i]);
                }
            }

            Offline.remove({
                'userid': userid
            }, function(err) {
                if (err) {
                    console.log("[offline][getMsg] remove false");
                    return false;
                }
            });
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'Offline_getmsg'});

    function getByPerson(i, res) {
        totalUser++;
        var theObj = {
            userid: i,
            length: res.total
        };

        getRealMsg(res.messages, userid, function(res) {
            theObj.msg = res;
            result.push(theObj);
            if (++loadUser >= totalUser) {
                if (callback) callback(result);
            }
        });
    }

    //remove the push count
    mongoConnect.connect(function(MongoConn) {
        MongoConn.db(mg2.dbname).collection('PushCache').remove({
            'touser': parseInt(userid)
        }, function(err) {
            if (err) {
                console.log("[offline][getMsg] remove false");
                return false;
            }
        });
    }, {ip: mg2.ip, port: mg2.port, name: 'offline_get'});
};

function getRealMsg(messageIds, uid, callback) {
    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg1.dbname).collection('Message').find({
            'messageId': {
                $in: messageIds
            }
        }, {
            'type': 0,
            '_id': 0
        }).toArray(function(err, res) {
                if (err) {
                    console.log("[offline][getRealMsg] find false");
                    return false;
                }
            notificationCallback(res, uid);
            if (callback) callback(res);
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'find_message_real'});
}

function notificationCallback(messages, toUser) {
    //get the notification then save to the message
    for (var i = 0, len = messages.length; i < len; i++) {
        var msg = messages[i].content;

        if (msg && (parseInt(msg.type) == 6 || parseInt(msg.type) == 7) && msg.msgid) {
            mongoConnect.connect(function(mongoC) {
                updateMongodb(msg, toUser, mongoC);
            }, {ip: mg3.ip, port: mg3.port, name: 'update_Notices'});
        }
    }

    function updateMongodb(msg, toUser, mongoC) {
        var pushObj = {};
        pushObj['groups.' + msg.togroup + '.hasrecieved'] = toUser;

        var pullObj = {};
        pullObj['groups.' + msg.togroup + '.unrecieved'] = toUser;

        var collection = mongoC.db(mg3.dbname).collection('Notices');
        collection.update({
            '_id': parseInt(msg.msgid)
        }, {
            //TODO:if need , don't forget pull out form the unreceived list
            $push: pushObj,
            $pull: pullObj
        }, function(err, res) {
            if (err) {
                console.log("[offline][notificationCallback] update false");
                return false;
            }
        });
    }
}

/**
 * get more offline message from server
 * @param  {String} userid     the host's userid
 * @param  {String} sendUserId  the people who send the message
 * @param  {Number} limit      home many per time
 * @return {[type]}            [description]
 */
exports.getMoreByPerson = function(userid, sendUserId, limit, callback) {

    if (!userid || !sendUserId) {
        console.log('[offline][getMoreByPerson] parameters error, userId: sendUserId:', userid, sendUserId);
        return false;
    }
    limit = parseInt(limit) || 20;

    mongoConnect.connect(function(MongoConn) {
        var MsgSta = MongoConn.db(mg2.dbname).collection('MsgSta');
        var findSql = {
            'unreach': parseInt(userid)
            //'reach': false
        };

        if (sendUserId) {
            findSql.poster = parseInt(sendUserId);
        }

        MsgSta.find(findSql).sort({
            '_id': -1
        }).limit(limit).toArray(function(err, res) {
            var mongoIds = [];
            var ids = [];
            if (err || res.length < 1) {
                if (callback) callback([]);
            } else {

                for (var i = 0, len = res.length; i < len; i++) {
                    mongoIds.push(res[i]._id);
                    ids.push(res[i].messageId);
                }
                getRealMsg(ids, userid, function(res) {
                    if (callback) callback(res);
                });
            }

            //update the message status
            MsgSta.update({
                '_id': {
                    $in: mongoIds
                }
            }, {
                $pull: {
                    'unreach': parseInt(userid)
                }
            }, {
                multi: true
            }, function(err, res) {
                if (err) {
                    console.log("[offline][getMoreByPerson] MsgSta update error");
                    return false;
                }
                console.log('The number of updated documents was %d', res);
            });
        });
    }, {ip: mg2.ip, port: mg2.port, name: 'update_msgsta_more_info'});

};