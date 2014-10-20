'use strict';

var hash = require('../../tool/hash/hash.js');
var redisC = require('../../connect/redis');
var mongoClient = require('../../connect/mongo');
var msgsend = require('../../tool/msg/msgsend');
var msgSave = require('../../tool/msg/msgsave');
var offline = require('../../tool/msg/offline');

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
    //
    var toGroup = json.togroup.split(',');
    json.type = '6';
    json.status = 200;
    json.order = 'MSG';
    json.time = +new Date();

    console.log(json, toGroup);
    for (var i = 0, len = toGroup.length; i < len; i++) {
        json.groupname = json.groupNames[toGroup[i]] || '';

        pushGroup(toGroup[i], json);
    }

    function pushGroup(gid, json) {
        if (!gid || !json) {
            return false;
        }
        json.togroup = gid;
        json.poster = json.userid;
        msgsend.group(json);

    }

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
    //
    var toGroup = json.togroup.split(',');
    json.type = '10';
    json.status = 200;
    json.order = 'MSG';
    json.time = +new Date();
    for (var i = 0, len = toGroup.length; i < len; i++) {
        pushGroup(toGroup[i], json);
    }

    function pushGroup(gid, json) {
        if (!gid || !json) {
            return false;
        }
        json.togroup = gid;
        json.poster = json.userid;
        //send to group
        msgsend.group(json);
    }

    var retjson = {
        'response': '200',
        'message': '请求成功'
    };
    retJSON(req, res, JSON.stringify(retjson));
}

/**
 *  person notification
 */

/*
function person(req, res, json) {
    //TODO: use msgsend.sendToPerson
    var redisStack = {};
    var totaluser = 0;
    var received = [];
    var unreceived = [];
    var i, redisHost;

    //sendToPerson  msg, touser, poster

    if (json.tousers) {
        var users = json.tousers.split(',');
        json.type = '7';
        json.order = 'MSG';
        json.status = 200;
        json.time = +new Date();
        json.messageId = id.id();
        //get redis srever

        var len = users.length;
        for (i = 0; i < len; i++) {
            totaluser++;
            redisHost = hash.getHash('PRedis', users[i]);
            var tag = redisHost.port + redisHost.ip;
            //stack the redis
            redisStack[tag] = redisStack[tag] || {};
            redisStack[tag].host = redisHost;
            redisStack[tag].ids = redisStack[tag].ids || [];
            redisStack[tag].ids.push(users[i]);
        }

        for (i in redisStack) {
            redisHost = redisStack[i].host;
            var ids = redisStack[i].ids;

            pushmessage(redisHost, ids, json);

        }

        var retjson = {
            'response': '200',
            'message': '请求成功'
        };
        retJSON(req, res, JSON.stringify(retjson));
    } else {
        ret404(req, res, 'tousers is necessary!');
    }

    function pushmessage(redisHost, ids, json) {
        redisC.connect(redisHost.port, redisHost.ip, function(client) {
            for (var j = 0, len = ids.length; j < len; j++) {
                push(client, ids[j]);
            }
        });

        function push(client, user) {
            client.sismember('online', user, function(err, isOnline) {
                if (isOnline === 1) {
                    var room = 'Room.' + user;
                    json.touser = user;
                    client.publish(room, JSON.stringify(json));
                    received.push(user);
                } else {
                    unreceived.push(user);
                }
                if (--totaluser <= 0) {
                    result(json.msgid);
                }
            });
        }
    }

    function result(msgid) {
        mongoClient.connect(function(mongoConnect) {
            var collection = mongoConnect.db(conf.mongodb.mg3.dbname).collection('Notices');

            var setVal = {};
            setVal['tousers.hasrecieved'] = {
                $each: received
            };
            setVal['tousers.unrecieved'] = {
                $each: unreceived
            };

            collection.update({
                '_id': parseInt(msgid)
            }, {
                $push: setVal,
                $set: {
                    'status': 2
                }
            }, {
                'upsert': true
            }, function() {
                console.log('[dispatch_notification.js update success]-->', msgid, setVal);
            });

        }, {ip: conf.mongodb.mg3.ip, port: conf.mongodb.mg3.port, name: 'update_dispatch_notification'});
    }
}
*/

function person(req, res, json) {

    var received = [];
    var unreceived = [];
    var i, redisHost, room, touser;

    if (!json.tousers) {
        ret404(req, res, 'tousers is necessary!');
    }

    var users = json.tousers.split(',');
    json.type = '7';
    json.order = 'MSG';
    json.status = 200;
    json.time = +new Date();

    for (i = 0; i < users.length; i++) {
        redisHost = hash.getHash('PRedis', users[i]);
        pushmessage(redisHost, users[i], json);
    }

    function pushmessage(redisHost, touser, json) {
        redisC.connect(redisHost.port, redisHost.ip, function(client) {
            json.touser = touser;
            json.messageId = id.id();
            room = 'Room.' + touser;

            client.publish(room, JSON.stringify(json));

            client.sismember('online', touser, function(err, isOnline) {
                if (isOnline) {
                    received.push(parseInt(touser));
                    console.log('person-->', touser, 'isOnline', isOnline);
                } else {
                    unreceived.push(parseInt(touser));
                    console.log(touser + ' is offline');
                    offline.pushMessage(json, touser, json.poster);
                }
            });

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
                mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
                    //success
                });
            }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_person'});
            //save msg statu to mongodb
            msgSave.sta({
                'messageId': json.messageId,
                'touser': [parseInt(json.touser)],
                'poster': parseInt(json.poster),
                'type': 7,
                'time': json.time
            });

        });
    }

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
                console.log("[notification][Notices] update false", err);
                return false;
            }
            console.log('[dispatch_notification.js update success]-->', json.msgid, setVal);
        });

    }, {ip: mg3.ip, port: mg3.port, name: 'update_dispatch_notification'});

    var retjson = {
        'response': '200',
        'message': '请求成功'
    };
    retJSON(req, res, JSON.stringify(retjson));
}

/**
 *
 **/
exports.group = group;
exports.person = person;
exports.shareGroup = shareGroup;