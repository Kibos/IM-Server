'use strict';
var nutcracker = require('nutcracker');

var redisPool = {};

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

            var client = nutcracker.createClient(port, ip);
            client.on('error', function(err) {
                console.error('!!!!!!redis connect error', err);
            });
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

exports.connect = connect;