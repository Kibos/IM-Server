'use strict';
var net = require('net');
var async = require('async');
var mongo = require('../connect/mongo');
var redis = require('../connect/redis');
var ObjectID = require('mongodb').ObjectID;
var conf = require('../conf/config');
var redisInfo = conf.sta.redis.cache;
var mongodb = conf.mongodb;

//connect to the redis and mongodb
redis.connect(redisInfo.port, redisInfo.ip, function(client) {
    client.select('1', function() {
        console.log('LogServer connected to redis ' + redisInfo.ip + ' and select 1');
        mongo.connect(function(mongoC) {
            console.log('LogServer connected to mongodb');
            main(mongoC, client);
        }, {ip : mongodb.mg1.ip, port : mongodb.mg1.port, name : 'read_Message'});
    });
});

function main(mongod, redis) {
    async.waterfall([
        function(cb) {
            getLastLogId(redis,cb);
        },function(lastId, cb) {
            console.log('lastId ID', lastId);
            getMessageRecord(mongod, lastId, cb);
        }
    ],function(err, result) {
        if (err) {
            console.log('[ log - app][getMessageRecord] result error!');
            return false;
        }
        var msgCount = result.length;
        var delCount = 0;

        function msgResult(data) {
            delCount++;

            if (delCount >= msgCount) {
                sendLog(data, function() {
                    setLaseLogId(redis, result[result.length - 1]._id, function(res) {
                        if (!res) {
                            console.log('setLaseLogId false !');
                            return false;
                        }
                        main(mongod, redis);
                    });
                });
            }
        }

        if (msgCount > 0) {
            for (var i = 0; i < msgCount; i++) {
                var type = parseInt(result[i].type);

                if (type === 0) {
                    personMsg(result[i].content, function(data) {
                        msgResult(data);
                    });
                } else if (type === 1) {
                    mongo.connect(function(mongoC) {
                        groupMsg(mongoC, result[i].content, function(data) {
                            msgResult(data);
                        });
                    }, {ip : mongodb.mg3.ip, port : mongodb.mg3.port, name : 'read_Talks'});
                } else if (type === 2) {
                    msgResult();//TODO
                }
            }
        } else {
            setTimeout(function() {
                console.log('Loop');
                main(mongod, redis);
            }, 1000);
        }
    });
}

//get last log id
function getLastLogId(redis, callback) {
    redis.get('lastLogId', function(err, res) {
        if (err) {
            console.log('[ log - app][getLastLogId] redis get false!');
            callback(null);
            return false;
        }
        callback(null, res);
    });
}

//set last log id
function setLaseLogId(redis, value, callback) {
    if (!value) {
        console.log('value is empty');
        return false;
    }
    redis.set('lastLogId', value, function(err, result) {
        if (err) {
            console.log('[app][setLaseLogId] set false!');
            return false;
        } else {
            callback(result);
        }
    });
}

//get messgae from mongodb
function getMessageRecord(mongoC, lastLogId, callback) {
    var query = {};
    if (lastLogId) {
        var id;
        try {
            id = new ObjectID(lastLogId);
            query = {
                _id: {
                    $gt: id
                }
            };
        } catch (e) {

        }
    }
    mongoC.db(mongodb.mg1.dbname).collection('Message').find(query, {
        type: true,
        content: true,
        time: true
    }).limit(10).toArray(function(err, result) {
            if (err) {
                console.log('[ log - app][getMessageRecord] find false!');
                callback(null);
                return false;
            }
            callback(null, result);
        });
}

//deal with personal message
function personMsg(msg, callback) {
    var src_obj = {
        'uid': msg.poster,
        'send_txt': msg.text
    };
    var dst_obj = {
        'uid': msg.touser
    };
    var logJson = {
        product: 'yiban4_0',
        platform: 'mobile',
        module: 'message',
        action: 'person',
        description: '用户单聊发送文本',
        time: (msg.time ? msg.time : +new Date()).toString().substr(0, 10),
        src_obj: src_obj,
        dst_obj: dst_obj
    };
    if (callback) callback(logJson);
}

//deal with group message
function groupMsg(mongo, msg, callback) {
    var _id = parseInt(msg.togroup);

    mongo.db(mongodb.mg3.dbname).collection('Talks').find({
        '_id': _id
    }).toArray(function(err, res) {
            //console.log('!!!!', _id, res, msg);
            var gid = 0,
                guid = 0;
            if (res.length >= 1) {
                gid = res[0].groupid;
                guid = res[0].creator;
            }

            var src_obj = {
                'uid': msg.poster,
                'send_txt': msg.text
            };
            var dst_obj = {
                'gid': gid,
                'guid': guid
            };
            var logJson = {
                product: 'yiban4_0',
                platform: 'mobile',
                module: 'message',
                action: 'group',
                description: '用户群组聊天发送文本',
                time: (msg.time || (+new Date())).toString().substr(0, 10),
                src_obj: src_obj,
                dst_obj: dst_obj
            };
            if (callback) callback(logJson);

        });
}

var client = {
    id: '',
    connected: false
};

(function connectServe() {
    var clientConnect = net.connect({
        host: '10.21.3.89',
        port: 5457
    }, function() {

        client.id = clientConnect;
        client.connected = true;

    });
    clientConnect.on('error', function() {
        client.connected = false;
        client.id = null;
        setTimeout(function() {
            connectServe();
        }, 2000);
    });
})();

//send to the server
function sendLog(data, callback) {
    if (client.connected) {
        console.log(JSON.stringify(data));
        client.id.write(JSON.stringify(data));
    }

    if (callback) callback();

}