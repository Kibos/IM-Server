'use strict';
var net = require('net');
var async = require('async');
var mongo = require('../connect/mongo');
var redis = require('../connect/redis');
var ObjectID = require('mongodb').ObjectID;
var conf = require('../conf/config');
var redisInfo = conf.sta.redis.cache;
var mongodb = conf.mongodb;
var time = new Date(2014, 10, 5);//month - 1


//connect to the redis and mongodb
redis.connect(redisInfo.port, redisInfo.ip, function(client) {
    client.select('1', function(err) {
        if (err) console.error('redis connect false');
        console.log('LogServer connected to redis ' + redisInfo.ip + ' and select 1');
        mongo.connect(function(mongoC) {
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
            console.error('[ log - app][getMessageRecord] result error!');
        }

        if (!result.length) {
            setTimeout(function() {
                console.log('Loop');
                main(mongod, redis);
            }, 1000);
        } else {
            async.each(result, function (message, callback) {
                choice(message, callback);
            }, function(err) {
                if (err) {
                    console.error('[ log - app][choice] false, err is ', err);
                }

                redis.set('lastLogId', result[result.length - 1]._id, function(err) {
                    if (err) {
                        console.error('[app][setLaseLogId] set false!');
                    } else {
                        main(mongod, redis);
                    }
                });
            });
        }

        function choice(message, callback) {
            if (message.type == 0) {
                personMsg(message.content, function(data) {
                    sendLog(data, callback);
                });
            } else if (message.type == 1) {
                mongo.connect(function(mongoC) {
                    groupMsg(mongoC, message.content, function(data) {
                        sendLog(data, callback);
                    });
                }, {ip : mongodb.mg3.ip, port : mongodb.mg3.port, name : 'read_Talks'});
            } else {
                console.log('type is ', message.type);
                callback(null);
            }
        }
    });
}

//get last log id
function getLastLogId(redis, callback) {
    redis.get('lastLogId', function(err, res) {
        if (err) {
            console.log('[ log - app][getLastLogId] redis get false!');
            callback(err);
        } else {
            callback(null, res);
        }
    });
}

//get messgae from mongodb
function getMessageRecord(mongoC, lastLogId, callback) {
    var query = {};
    if (lastLogId) {
        query = {
            _id: {
                $gt: new ObjectID(lastLogId)
            }
        };
    } else {
        query = {
            time: {
                $gt: +time
            }
        };
    }
    mongoC.db(mongodb.mg1.dbname).collection('Message').find(query, {
        type: true,
        content: true,
        time: true
    }).limit(10).toArray(function(err, result) {
        if (err) {
            console.error('[ log - app][getMessageRecord] find false!');
            callback(err);
        }
        callback(null, result || []);
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
            action: 'person',
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
        host: '10.21.67.159',
        port: 5457
    }, function() {
        client.id = clientConnect;
        client.connected = true;
    });
    clientConnect.on('error', function(err) {
        console.error('net connect err, result is ', err);
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
        console.log('send to D pang zi message is : ', JSON.stringify(data));
        client.id.write(JSON.stringify(data));
        callback(null);
    } else {
        callback(false);
    }
}