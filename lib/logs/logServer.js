'use strict';

var net = require('net');
var mongoClient = require('../mongodb/connect');
var redisConnect = require('../redis/connect');
var ObjectID = require('mongodb').ObjectID;
var redisInfo = require('../../conf/config').sta.redis.cache;
var conf = require('../../conf/config');


//connect to the redis and mongodb
redisConnect.connect(redisInfo.port, redisInfo.ip, function(client) {
    client.select('1', function() {
        console.log('LogServer connected to redis and select 1');
        mongoClient.connect(function(mongoC) {
            console.log('LogServer connected to mongodb');

            main(mongoC, client);
        });
    });
});

//get last log id
function getLastLogId(redis, callback) {
    redis.get('lastLogId', function(err, res) {
        if (callback) callback(res || '');
    });
}

//set last log id
function setLaseLogId(redis, value, callback) {
    if (!value) {
        return false;
    }
    redis.set('lastLogId', value, function(err, result) {
        if (callback) callback(result);
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
    mongoC.db(conf.mongodb.mg1.dbname).collection('Message').find(query, {
        type: true,
        content: true,
        time: true
    }).limit(10).toArray(function(err, result) {
        if (callback) callback(result || []);
    });
}


//the main function
function main(mongod, redis) {
    //find the last mongdoId
    getLastLogId(redis, LastIdCallback);

    function LastIdCallback(lastId) {
        //get messages based on the last id
        console.log('lastId ID', lastId);
        //FIX Me
        getMessageRecord(mongod, lastId, getmessageCallback);
    }

    function getmessageCallback(result) {
        //console.log('!!!!', result, result.length);

        //deal with each kind of message
        var msgCount = result.length,
            delCount = 0,
            logDate = [],
            msgResult = function(data) {
                delCount++;
                if (data) {
                    logDate.push(data);
                }
                if (delCount >= msgCount) {
                    console.log('msgCount  ok');
                    sendToServer(logDate, function() {
                        setLaseLogId(redis, result[result.length - 1]._id, setLastIdCallback);
                    });
                }
            };

        if (msgCount > 0) {
            for (var i = 0; i < msgCount; i++) {
                //console.log('!!!!!', result[i]);
                var type = parseInt(result[i].type);
                console.log(type);
                if (type === 0) {
                    //persnoal message
                    personMsg(result[i].content, msgResult);
                } else if (type === 1) {
                    //group message
                    groupMsg(mongod, result[i].content, msgResult);
                } else if (type === 2) {
                    //system message
                    msgResult();
                }
            }
        } else {
            setTimeout(function() {
                console.log('Loop');
                main(mongod, redis);
            }, 1000);
        }
    }

    //send the data to the server
    function sendToServer(data, callback) {
        sendLog(data, function() {
            if (callback) callback();
        });
    }

    function setLastIdCallback(result) {
        console.log('@@@@@', result);
        main(mongod, redis);
    }
}

//deal with personal message
function personMsg(msg, callback) {
    var logJson = {
        product: 'yiban4_0',
        platform: 'mobile',
        module: 'message',
        action: 'person',
        description: '用户单聊发送文本',
        time: (msg.time ? msg.time : +new Date()).toString().substr(0, 10),
        src_obj: '{"uid":' + msg.poster + ',"send_txt":' + msg.text + '}',
        dst_obj: '{"uid":' + msg.touser + '}'
    };
    if (callback) callback(logJson);
}

//deal with group message
function groupMsg(mongo, msg, callback) {
    var _id = parseInt(msg.togroup);

    mongo.db(conf.mongodb.mg1.dbname).collection('Talks').find({
        '_id': _id
    }).toArray(function(err, res) {
        //console.log('!!!!', _id, res, msg);
        var gid = 0,
            guid = 0;
        if (res.length >= 1) {
            gid = res[0].groupid;
            guid = res[0].creator;
        }
        var logJson = {
            product: 'yiban4_0',
            platform: 'mobile',
            module: 'message',
            action: 'group',
            description: '用户群组聊天发送文本',
            time: (msg.time).toString().substr(0, 10),
            src_obj: '{"uid":' + msg.poster + ',"send_txt":"' + msg.text + '"}',
            dst_obj: '{"gid":' + gid + ',"guid":' + guid + '}'
        };
        if (callback) callback(logJson);

    });
}

var client = {
    id: '',
    connected: false
};

(function connectServe() {
    var client = net.connect({
        host: '10.21.3.89',
        port: 5457
    }, function() {
        client.id = client;
        client.connected = true;
    });
    client.on('error', function() {
        client.connected = false;
        client.id = null;
        setTimeout(function() {
            connectServe();
        }, 1000);
    });
})();

//send to the server
function sendLog(data, callback) {

    if (client.connected) {
        client.id.write(JSON.stringify([data]));
    }

    if (callback) callback();

}