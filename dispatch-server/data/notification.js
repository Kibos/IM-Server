'use strict';

var hash = require('../../tool/hash/hash.js');
var redisC = require('../../connect/redis');
var mongoClient = require('../../connect/mongo');
var msgsend = require('../../tool/msg/msgsend');
var id = require('../../tool/id');
var ret403 = require('./ret').ret403;
var retJSON = require('./ret').retJSON;
var conf = require('../../conf/config');

/**
 *  group notification
 */

function group(req, res, json) {

    if (!json.togroup) {
        ret403(req, res, 'togroup is necessary');
        return false;
    }

    if (!json.groupNames) {
        ret403(req, res, 'groupNames is necessary');
        return false;
    } else {
        try {
            json.groupNames = JSON.parse(json.groupNames);
        } catch (e) {
            ret403(req, res, 'groupNames is not json string');
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

    retJSON(req, res, JSON.stringify(retjson));

}

/**
 *   share information to group(s)
 */

function shareGroup(req, res, json) {
    if (!json.togroup) {
        ret403(req, res, 'togroup is necessary');
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

    retJSON(req, res, JSON.stringify(retjson));
}

/**
 *  person notification
 */


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

        retJSON(req, res, JSON.stringify(retjson));
    } else {
        ret403(req, res, 'tousers is necessary!');
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


/**
 *
 **/
exports.group = group;
exports.person = person;
exports.shareGroup = shareGroup;

/////