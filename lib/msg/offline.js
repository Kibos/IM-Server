'use strict';

var mongoConnect = require('../mongodb/connect');
var conf = require('../../conf/config');

/**
 * push message
 * all the offline message going here
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

        //deal with the message push , the touser can be like this 1,2,3 (multi)
        var toUserArray = touser.toString().split(',').map(function(item) {
            return parseInt(item, 10);
        });
        var pushCache = MongoConn.db(conf.mongodb.mg1.dbname).collection('PushCache');
        var pushStack = MongoConn.db(conf.mongodb.mg1.dbname).collection('PushStack');
        //get the total number and save to the redis stack
        pushCache.find({
            'touser': {
                $in: toUserArray
            }
        }).toArray(function(err, res) {

            if (err) {
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
            pushStack.insert(StackObj, function() {
                if (callback) callback();
            });
        });

        for (var i = 0, len = toUserArray.length; i < len; i++) {
            //update the total number
            pushUpdate(toUserArray[i]);
        }

        function pushUpdate(uid) {
            pushCache.update({
                'touser': parseInt(uid)
            }, {
                $inc: {
                    'total': 1
                }
            }, {
                'upsert': true
            }, function() {});
        }
    });

    //save to offline
    exports.offlineSave(message, touser, poster);
};

/**
 * save to offline
 * @param {[type]} [varname] [description]
 */
exports.offlineSave = function(message, touser, poster, option, callback) {

    mongoConnect.connect(function(mongoC) {
        var Offline = mongoC.db(conf.mongodb.mg1.dbname).collection('Offline');
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
            // console.log(err, res);
            if (callback) callback(err, res);

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
    userid = parseInt(userid);
    var result = [];
    var totalUser = 0;
    var loadUser = 0;
    mongoConnect.connect(function(mongoC) {
        var Offline = mongoC.db(conf.mongodb.mg1.dbname).collection('Offline');
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
            }, function() {});
        });
    });

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
        MongoConn.db(conf.mongodb.mg1.dbname).collection('PushCache').remove({
            'touser': parseInt(userid)
        }, function() {});
    });

};

function getRealMsg(messageIds, uid, callback) {
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
            if (callback) callback(res);
        });
    });
}

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
        pushObj['groups.' + msg.togroup + '.hasrecieved'] = toUser;

        var pullObj = {};
        pullObj['groups.' + msg.togroup + '.unrecieved'] = toUser;

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
exports.getMsgOld = function(userid, callback) {


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

    // function getRealMsg(messageIds, length, uid, callback) {
    //     mongoConnect.connect(function(mongoC) {
    //         mongoC.db(conf.mongodb.mg1.dbname).collection('Message').find({
    //             'messageId': {
    //                 $in: messageIds
    //             }
    //         }, {
    //             'type': 0,
    //             '_id': 0
    //         }).toArray(function(err, res) {
    //             notificationCallback(res, uid, mongoC);
    //             if (callback) callback(res, length);
    //         });
    //     });
    // }

    // //TEST NEW

    // function notificationCallback(messages, toUser, mongoC) {

    //     //get the notification then save to the message
    //     for (var i = 0, len = messages.length; i < len; i++) {
    //         var msg = messages[i].content;

    //         if (msg && (parseInt(msg.type) == 6 || parseInt(msg.type) == 7) && msg.msgid) {
    //             updateMongodb(msg, toUser, mongoC);
    //         }

    //     }

    //     function updateMongodb(msg, toUser, mongoC) {
    //         var pushObj = {};
    //         pushObj['groups.' + msg.togroup + '.hasrecieved'] = userid;

    //         var pullObj = {};
    //         pullObj['groups.' + msg.togroup + '.unrecieved'] = userid;

    //         var collection = mongoC.db(conf.mongodb.mg1.dbname).collection('Notices');
    //         collection.update({
    //             '_id': parseInt(msg.msgid)
    //         }, {
    //             //TODO:if need , don't forget pull out form the unreceived list
    //             $push: pushObj,
    //             $pull: pullObj
    //         }, function() {

    //         });
    //     }

    // }
    //remove the push count
    mongoConnect.connect(function(MongoConn) {
        MongoConn.db(conf.mongodb.mg1.dbname).collection('PushCache').remove({
            'touser': parseInt(userid)
        }, function() {});
    });

};


/**
 * get more offline message from server
 * @param  {String} userid     the host's userid
 * @param  {String} sendUserId  the people who send the message
 * @param  {Number} limit      home many per time
 * @return {[type]}            [description]
 */
exports.getMoreByPerson = function(userid, sendUserId, limit, callback) {

    if (!userid) {
        return false;
    }

    mongoConnect.connect(function(MongoConn) {
        var MsgSta = MongoConn.db(conf.mongodb.mg1.dbname).collection('MsgSta');
        var findSql = {
            'touser': parseInt(userid),
            'reach': false
        };

        if (sendUserId) {
            findSql.poster = parseInt(sendUserId);
        }

        MsgSta.find(findSql).limit(limit || 20).toArray(function(err, res) {
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
                $set: {
                    'reach': true
                }
            }, {
                multi: true
            }, function() {

            });
        });
    });

};