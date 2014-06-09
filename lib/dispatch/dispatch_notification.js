var hash = require('../hash/hash');
var redisC = require('../redis/connect');
var ObjectID = require('mongodb').ObjectID;
var mongoClient = require('../mongodb/connect');
var msgsend = require('../msg/msgsend');

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
    res.end('{"response" : "404","message":"' + msg + '"}');
}

/**
 *  group notification
 */


function group(req, res, json) {

    if (!json.togroup) {
        ret404(req, res, 'togroup is necessary');
        return false;
    }
    //
    var toGroup = json.togroup.split(',');
    json.type = "6";
    json.status = 200;
    json.order = "MSG";
    json.time = +new Date();
    console.log(json, toGroup);
    for (var i = 0, len = toGroup.length; i < len; i++) {
        console.log('pushGroup', toGroup[i]);
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
        "response": "200",
        "message": "请求成功"
    };
    retJSON(req, res, JSON.stringify(retjson));

};

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
    json.type = "10";
    json.status = 200;
    json.order = "MSG";
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
        "response": "200",
        "message": "请求成功"
    };
    retJSON(req, res, JSON.stringify(retjson));
}

/**
 *  person notification
 */


function person(req, res, json) {
    
    if (json.tousers) {
        var users = json.tousers.split(',');
        json.type = '7';
        //get redis srever
        var redisStack = {};
        var totaluser = 0;
        var received = [];
        var unreceived = [];
        for (var i = 0, len = users.length; i < len; i++) {
            totaluser++;
            var redisHost = hash.getHash('PRedis', users[i]);
            var tag = redisHost.port + redisHost.ip;
            //stack the redis
            redisStack[tag] = redisStack[tag] || {};
            redisStack[tag].host = redisHost;
            redisStack[tag].ids = redisStack[tag].ids || [];
            redisStack[tag].ids.push(users[i]);
        }

        for (var i in redisStack) {
            var redisHost = redisStack[i].host;
            var ids = redisStack[i].ids;
            (function(redisHost, ids, json) {
                redisC.connect(redisHost.port, redisHost.ip, function(client) {
                    for (var j = 0, len = ids.length; j < len; j++) {
                        (function(user) {
                            client.sismember('online', user, function(err, isOnline) {
                                if (isOnline === 1) {
                                    var room = "Room." + user;

                                    json.order = "MSG";
                                    json.status = 200;
                                    json.time = +new Date();
                                    json.touser = user;
                                    json.type = 7;
                                    client.publish(room, JSON.stringify(json));
                                    received.push(user);
                                } else {
                                    unreceived.push(user);
                                }
                                if (--totaluser <= 0) {
                                    result(json.msgid);
                                }
                            });
                        })(ids[j]);
                    }
                });
            })(redisHost, ids, json);
        };

        function result(msgid) {
            mongoClient.connect(function(mongoConnect) {
                var collection = mongoConnect.db("larvel").collection('Notices');

                collection.update({
                    "_id": parseInt(msgid)
                }, {
                    $set: {
                        "tousers.hasrecieved": received,
                        "tousers.unrecieved": unreceived,
                        "status": 2
                    }
                }, function(err, res) {
                    console.log('[dispatch_notification.js update success]-->', {
                        "hasrecieved": received,
                        "unrecieved": unreceived,
                        "status": 2
                    });
                });

            });
        }

        var retjson = {
            "response": "200",
            "message": "请求成功"
        };
        retJSON(req, res, JSON.stringify(retjson));
    } else {
        ret404(req, res, 'tousers is necessary!');
    }
};

/**
 *
 **/
exports.group = group;
exports.person = person;
exports.shareGroup = shareGroup;

/////