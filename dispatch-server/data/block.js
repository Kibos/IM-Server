'use strict';

var conf = require('../../conf/config').sta.redis.cache;
var redisClient = require('../../connect/redis');
var ret403 = require('./ret').ret403;
var retJSON = require('./ret').retJSON;
var redisPort = conf.port;
var redisIp = conf.ip;

function block(req, res, json) {
    console.log('[dispatch_block] -->', json);
    if (!json.touser) {
        ret403(req, res, 'touser is necessary!');
    }
    if (!json.poster) {
        ret403(req, res, 'poster is necessary!');
    }
    if (!json.access_token) {
        ret403(req, res, 'access_token is necessary!');
    }
    if (!json.action) {
        ret403(req, res, 'action is necessary!');
    }

    require('../msg/msgsend').sys(json.touser, json);

    //delete the touser's friend cache
    //
    //client.del(setName, function() {})
    //
    redisClient.connect(redisPort, redisIp, function(client) {
        client.select('2', function() {
            var setName = 'user:' + json.touser + ':friends';
            client.del(setName, function() {});
        });
    });


    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    retJSON(req, res, {
        'sta': 200,
        'msg': '发送成功'
    });
}

exports.block = block;