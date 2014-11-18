'use strict';
var redisConnect = require('../../connect/redis');
var mongoConnect = require('../../connect/mongo');
var conf = require('../../conf/config');
var async = require('async');
var redisPort = conf.sta.redis.cache.port;
var redisIp = conf.sta.redis.cache.ip;
var select = conf.sta.redis.cache.select;
var mongodb = conf.mongodb;

var mg1 = mongodb.mg1;
var mg2 = mongodb.mg2;
var mg3 = mongodb.mg3;

var start = 0;
var end = 19;

/**
 * push message
 * all the offline message going here
 * @return {[type]}
 */
exports.pushMessage = function(message, touser, poster, option, callback) {
    if (!touser) {
        console.error('[offline][pushMessage]touser is missing.');
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
            } else if (message.video) {
                textMsg = '发来一条[语音]';
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
                console.error('[msgsend][offline] push Cache false');
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
                    console.error("[offline][pushMessage] insert false");
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
                    console.error("[offline][pushMessage] update false");
                    return false;
                }
            });
        }
    }, {ip: mg2.ip, port: mg2.port, name: 'offline_pushMessage'});

    //deal with the message push , the touser can be like this 1,2,3 (multi)
    for (var i = 0, len = toUserArray.length; i < len; i++) {
        //save to offline
        exports.offlineSave(message.messageId, toUserArray[i], poster);
    }
};

/**
 * save to offline
 * @param {[type]} [varname] [description]
 */
exports.offlineSave = function(messageId, touser, poster) {

    var message = poster + ':' + messageId;
    redisConnect.connect(redisPort, redisIp, function(client) {
        client.select(select, function () {
            client.LPUSH (touser, message, function (err, res) {
                if (err) {
                    console.error('[offline][offlineSave] LPUSH is false, err is ', err);
                    return false;
                }
                if (res > 20) {
                    client.LTRIM(touser, start, end, function(err, res) {
                        if (err) {
                            console.error('[offline][offlineSave] LTRIM is false, err is ', err);
                            return false;
                        }
                        console.log('[offline][LTRIM] ', touser, 'result is ', res);
                    });
                }

                client.LRANGE(touser, 0, -1, function(err, res) {
                    if (err) {
                        console.error('[offline][offlineSave] LRANGE is false, err is ', err);
                        return false;
                    }
                    console.log(touser, 'offline lists : ', res);
                });
            });
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
    var array = [];

    var temp = {};
    var poster = null;
    var messageId = null;

    redisConnect.connect(redisPort, redisIp, function(client) {
        client.select(select, function () {
            client.LRANGE(userid, 0, -1, function (err, res) {
                if (err || !res) {
                    console.error('[offline][getMsg] LRANGE is false, err is ', err);
                    if (callback) callback(err || []);
                    return false;
                }

                for (var item in res) {
                    poster = res[item].split(':', 2)[0];
                    messageId = res[item].split(':', 2)[1];
                    if(!temp[poster]) {
                        temp[poster] = {};
                        temp[poster].messageIds = [];
                    }
                    temp[poster].messageIds.push(messageId);
                }

                for (var i in temp) {
                    array.push({
                        poster: i,
                        msgs:temp[i].messageIds});
                }

                async.eachSeries(array, function(message, callback) {
                    async.waterfall([
                        function(cb) {
                            getRealMsg(message.msgs, userid, cb);
                        }
                    ], function(err, res) {
                        if (err) {
                            console.error('[offline][getMsg] getRealMsg is false. err is ', err);
                        }
                        var theObj = {
                            userid: message.poster,
                            length: message.msgs.length,
                            msg: res
                        };
                        result.push(theObj);
                        callback();
                    });
                }, function(err) {
                    if (err) {
                        console.error('[offline][getMsg] getRealMsg is false. err is ', err);
                        if (callback) callback(err);
                    }
                    //delete offline list from redis
                    for (var i = 0; i < res.length; i ++) {
                        client.RPOP(userid, function(err, result) {
                            if (err) {
                                console.error('[offline][getMsg] RPOP is false, err is ', err);
                                if (callback) callback(err);
                            }
                            console.log('[lists] delete  ', result);
                        });
                    }

                    console.log("return client result is ", result);
                    if (callback) callback(result);
                });
            });
        });
    });

    //remove the push count
    mongoConnect.connect(function(MongoConn) {
        MongoConn.db(mg2.dbname).collection('PushCache').remove({
            'touser': parseInt(userid)
        }, function(err) {
            if (err) {
                console.error("[offline][getMsg] remove false");
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
                    console.error("[offline][getRealMsg] find false");
                    if (callback) callback(err);
                    return false;
                }
            notificationCallback(res, uid);
            if (callback) callback(null, res);
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
        var pullObj = {};

        if (msg.togroup) {
            pushObj['groups.' + msg.togroup + '.hasrecieved'] = toUser;
            pullObj['groups.' + msg.togroup + '.unrecieved'] = toUser;
        } else if (msg.tousers) {
            pushObj['tousers.hasrecieved'] = toUser;
            pullObj['tousers.unrecieved'] = toUser;
        } else {
            console.err('[offline][notificationCallback] is false.');
            return false;
        }

        var collection = mongoC.db(mg3.dbname).collection('Notices');
        collection.update({
            '_id': parseInt(msg.msgid)
        }, {
            //TODO:if need , don't forget pull out form the unreceived list
            $push: pushObj,
            $pull: pullObj
        }, function(err, res) {
            if (err) {
                console.error("[offline][notificationCallback] update false, err is ", err);
                return false;
            }
            console.log('[offline][notificationCallback] update success ,effect line is ', res);
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

    // TODO BUG
    return false;
    //
    if (!userid || !sendUserId) {
        console.error('[offline][getMoreByPerson] parameters error, userId: sendUserId:', userid, sendUserId);
        return false;
    }
    limit = parseInt(limit) || 20;

    mongoConnect.connect(function(MongoConn) {
        var MsgSta = MongoConn.db(mg2.dbname).collection('MsgSta');
        var findSql = {
            'unreach': parseInt(userid)
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
                    console.error("[offline][getMoreByPerson] MsgSta update error");
                    return false;
                }
                console.log('The number of updated documents was %d', res);
            });
        });
    }, {ip: mg2.ip, port: mg2.port, name: 'update_msgsta_more_info'});

};