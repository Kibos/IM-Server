'use strict';
var redis = require('redis');

var redisPool = {};
var redisPwd = require('../conf/config').redisPwd;

/**
 * this function is to connect to the redis server
 * if the connection is already connected use it or create one
 * @param {Object} port
 * @param {Object} ip
 * @param {Object} callback
 */

function connect(port, ip, callback) {
    var cid = port.toString() + ip.toString();
    redisPool[cid] = redisPool[cid] || {};
    if (redisPool[cid].sta == 'ok') {
        if (callback) callback(redisPool[cid].client);
    } else {
        if (redisPool[cid].sta == 'progress') {
            redisPool[cid].stack = redisPool[cid].stack || [];
            redisPool[cid].stack.push(callback);
        } else {
            redisPool[cid].sta = 'progress';
            redisPool[cid].stack = redisPool[cid].stack || [];
            redisPool[cid].stack.push(callback);

            var client = redis.createClient(port, ip);
            client.on('error', function(err) {
                console.log('!!!!!!redis connect error', err);
            });
            if (redisPwd[ip]) {
                client.auth(redisPwd[ip] || '', function(err, res) {
                    if (res.toLowerCase() == 'ok') {
                        client.on('ready', function() {
                            redisPool[cid].sta = 'ok';
                            redisPool[cid].client = client;
                            //do all the callback
                            for (var i = 0; i < redisPool[cid].stack.length; i++) {
                                redisPool[cid].stack[i](client);
                            }
                            redisPool[cid].stack = [];
                        });
                    } else {
                        delete redisPool[cid];
                    }
                });
            } else {
                client.on('ready', function() {
                    redisPool[cid].sta = 'ok';
                    redisPool[cid].client = client;
                    //do all the callback
                    for (var i = 0; i < redisPool[cid].stack.length; i++) {
                        redisPool[cid].stack[i](client);
                    }
                    redisPool[cid].stack = [];
                });
            }

        }
    }
}

/**
 * this is the function to sub the channel
 * @param {Object} port
 * @param {Object} ip
 * @param {Object} channel
 * @param {Object} callback
 */

function sub(port, ip, channel, callback) {
    var cid = port.toString() + ip.toString() + '_sub';
    redisPool[cid] = redisPool[cid] || {};
    redisPool[cid].stack = redisPool[cid].stack || {};
    redisPool[cid].stack[channel] = callback;

    if (!redisPool[cid].client) {

        if (redisPool[cid].sta !== 'progress') {
            redisPool[cid].sta = 'progress';
            var client = redis.createClient(port, ip);
            client.on('error', function(err) {
                console.log('!!!!!!redis connect error', err);
            });

            if (redisPwd[ip]) {
                client.auth(redisPwd[ip] || '', function(err, res) {
                    if (res.toLowerCase() == 'ok') {
                        client.on('ready', function() {
                            redisPool[cid].sta = 'ok';
                            redisPool[cid].client = client;
                            //do all the callback
                            for (var i in redisPool[cid].stack) {
                                client.subscribe(i);
                            }
                            client.on('message', function(channel, message) {
                                console.log('redis received message:', message);
                                redisPool[cid].stack[channel](message);
                            });
                        });

                    } else {
                        delete redisPool[cid];
                    }
                });
            } else {
                client.on('ready', function() {
                    redisPool[cid].sta = 'ok';
                    redisPool[cid].client = client;
                    //do all the callback
                    for (var i in redisPool[cid].stack) {
                        client.subscribe(i);
                    }
                    client.on('message', function(channel, message) {
                        console.log('redis received message:', message);
                        redisPool[cid].stack[channel](message);
                    });
                });
            }

        }

    } else {

        redisPool[cid].client.subscribe(channel);
    }

}

exports.connect = connect;
exports.sub = sub;