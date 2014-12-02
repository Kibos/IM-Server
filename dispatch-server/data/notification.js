'use strict';

var hash = require('../../tool/hash/hash.js');
var redisC = require('../../connect/redis');
var mongoClient = require('../../connect/mongo');
var msgsend = require('../../tool/msg/msgsend');
var msgSave = require('../../tool/msg/msgsave');
var offline = require('../../tool/msg/offline');
var async = require('async');

var id = require('../../tool/id');
var conf = require('../../conf/config');
var mg1 = conf.mongodb.mg1;
var mg3 = conf.mongodb.mg3;

/**
 *
 */

function retJSON(req, res, JSON) {
    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    res.end(JSON);
}

function ret404(req, res, msg) {
    res.writeHead(404, {
        'Content-Type': 'application/json'
    });
    res.end('{"response" : "404","message":"' + msg + '""}');
}

/**
 *  group notification
 */

function group(req, res, json) {

    if (!json.togroup) {
        ret404(req, res, 'togroup is necessary');
        return false;
    }

    if (!json.groupNames) {
        ret404(req, res, 'groupNames is necessary');
        return false;
    } else {
        try {
            json.groupNames = JSON.parse(json.groupNames);
        } catch (e) {
            ret404(req, res, 'groupNames is not json string');
        }
    }

    //return to php Immediately
    var retjson = {
        'response': '200',
        'message': '请求成功'
    };
    retJSON(req, res, JSON.stringify(retjson));

    var toGroup = json.togroup.split(',');
    json.type = '6';
    json.status = 200;
    json.order = 'MSG';
    json.time = +new Date();
    json.poster = json.userid;

    console.log(json, toGroup);

    async.eachSeries(toGroup, function(item, cb) {
        json.groupname = json.groupNames[item] || '';
        json.togroup = item;
        msgsend.dispatchGroup(json, cb);
    }, function(err) {
        if (err) {
            console.error('[dispatch server][group] is false. err is ', err);
        }
        console.log('[notifications][group] is success.')
    });
}

function messageSysGroup(req, res, json) {

    if (!json.togroup) {
        ret404(req, res, 'togroup is necessary');
        return false;
    }

    if (!json.action) {
        ret404(req, res, 'action is necessary');
        return false;
    }

    if (!json.group_type) {
        ret404(req, res, 'group_type is necessary');
        return false;
    }

    if (!json.groupname) {
        ret404(req, res, 'groupname is necessary');
        return false;
    }

    json.order = 'SYS';
    json.type = '1';

    console.log('[notification][messageSysGroup] json is ', json);
    msgsend.dispatchGroup(json);

    var retjson = {
        'response': '200',
        'message': '请求成功'
    };
    retJSON(req, res, JSON.stringify(retjson));
}

/**
 *   share information to group(s)
 */

function shareGroup(req, res, json) {
    if (!json.togroup) {
        ret404(req, res, 'togroup is necessary');
        return false;
    }
    //return to php Immediately
    var retjson = {
        'response': '200',
        'message': '请求成功'
    };
    retJSON(req, res, JSON.stringify(retjson));

    var toGroup = json.togroup.split(',');
    json.type = '10';
    json.status = 200;
    json.order = 'MSG';
    json.time = +new Date();
    json.poster = json.userid;

    async.eachSeries(toGroup, function(item, cb) {
        json.togroup = item;
        msgsend.dispatchGroup(json, cb);
    }, function(err) {
        if (err) {
            console.error('[dispatch server][group] is false. err is ', err);
        }
    });
}

/**
 *  person notification
 */

function person(req, res, json) {

    var received = [];
    var unreceived = [];
    var redisHost, room;

    if (!json.tousers) {
        ret404(req, res, 'tousers is necessary!');
    }

    //return to php Immediately
    var retjson = {
        'response': '200',
        'message': '请求成功'
    };
    retJSON(req, res, JSON.stringify(retjson));

    var users = json.tousers.split(',');
    json.type = '7';
    json.order = 'MSG';
    json.status = 200;
    json.time = +new Date();

    async.each(users, function(user, callback) {
        pushmessage(user, json, callback);
    }, function(err) {
        if (err) {
            console.error('[notification][person] async.eachSeries is false. err is ', err);
            return false;
        }
        doUpdate();
    });

    function pushmessage(touser, json, callback) {
        async.waterfall([
            function(cb) {
                doPushArr(cb);
            }, function(cb) {
                insertMsg(cb);
            }, function(cb) {
                saveSta(cb);
            }
        ], function(err) {
            if (err) {
                console.error('[notification][pushmessage] is false. err is ', err);
                callback(err);
            }
            callback(null);
        });
        function doPushArr(callback) {
            redisHost = hash.getHash('PRedis', touser);

            redisC.connect(redisHost.port, redisHost.ip, function(client) {
                json.touser = touser;
                json.messageId = id.id();
                room = 'Room.' + touser;

                client.publish(room, JSON.stringify(json));

                client.sismember('online', touser, function(err, isOnline) {
                    if (isOnline) {
                        received.push(parseInt(touser));
                        console.log('person-->', touser, 'isOnline');
                    } else {
                        unreceived.push(parseInt(touser));
                        console.log(touser + ' is offline');
                        offline.pushMessage(json, touser, json.poster);
                    }
                });
            });
            callback(null);
        }

        function insertMsg(callback) {
            //save the message log & save the message status
            var msgData = {
                'type': 7,
                'from': parseInt(json.poster),
                'to': parseInt(json.touser),
                'content': json,
                'time': json.time,
                'messageId': json.messageId
            };
            mongoClient.connect(function(mongoC) {
                mongoC.db(mg1.dbname).collection('Message').insert(msgData, function(err) {
                    if (err) {
                        console.error('[notification][insert msg] is false. err is ', err);
                        callback(err);
                    }
                    callback(null);
                    //success
                });
            }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_person'});
        }

        function saveSta(callback) {
            //save msg statu to mongodb
            msgSave.sta({
                'messageId': json.messageId,
                'touser': json.touser,
                'poster': json.poster,
                'type': 7
            }, callback);
        }

    }

    function doUpdate() {
        mongoClient.connect(function(mongoConnect) {
            var collection = mongoConnect.db(mg3.dbname).collection('Notices');

            var setVal = {};
            setVal['tousers.hasrecieved'] = {
                $each: received
            };
            setVal['tousers.unrecieved'] = {
                $each: unreceived
            };

            collection.update({
                '_id': parseInt(json.msgid)
            }, {
                $push: setVal,
                $set: {
                    'status': 2
                }
            }, {
                'upsert': true
            }, function(err) {
                if (err) {
                    console.error("[notification][Notices] update false, err is ", err);
                    return false;
                }
                received = [];
                unreceived = [];
                console.log('[dispatch_notification.js update success]-->', json.msgid, setVal);
            });

        }, {ip: mg3.ip, port: mg3.port, name: 'update_dispatch_notification'});
    }
}

/**
 *
 **/
exports.group = group;
exports.messageSysGroup = messageSysGroup;
exports.person = person;
exports.shareGroup = shareGroup;