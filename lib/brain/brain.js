/**
 * Brain.js
 * this file is to connect to the BrainServer,
 * if the brainserver is out of server,it will try to reconnect in each 1000ms
 */
'use strict';

var conf = require('../../conf/config');
var brainIp = conf.brain.brain1.ip;
var brainPort = conf.brain.brain1.port;
var net = require('net');
var hash = require('../hash/hash.js');

var brain = {};

(function(exp) {

    var callbacks = {};
    var fnStack = {};
    var client = new net.Socket();
    var reconnect = false;
    var heartId = 0;

    //connect the brain server
    function socketConnect(callback) {

        client.connect(brainPort, brainIp);

        if (reconnect) {
            return false;
        }

        client.setKeepAlive(true, 10000);

        client.on('connect', function() {
            if (reconnect) {
                for (var i in fnStack) {
                    for (var j in fnStack[i]) {
                        exp[i].apply(this, fnStack[i][j]);
                    }
                }
            }
            heartbeat(client);
        });

        client.on('data', function(data) {
            if (callback) callback(data, client);
        });

        client.on('close', function() {
            reconnect = true;
            console.log('[brain.js] client close {' + brainIp + ':' + brainPort + '}', new Date());
            setTimeout(function() {
                socketConnect(callback);
            }, 1000);
        });

        client.on('error', function() {
            reconnect = true;
            console.log('[brain.js] client error', new Date());
            setTimeout(function() {
                socketConnect(callback);
            }, 1000);
        });
    }

    socketConnect(datalisten);

    function datalisten(data, socket) {

        var dataStr = data.toString();
        var orders = dataStr.match(/(\{.+?\})(?={|$)/g);
        orders.forEach(function(data) {
            var rec = JSON.parse(data);

            if (rec.order === 'add') {
                //add to hash
                if (rec.self) {
                    //if self that mean you are a new connect
                    //we add all the server to your hash list
                    var allHash = rec.hash;
                    if (typeof(rec.hash) !== 'object') {
                        allHash = JSON.parse(rec.hash);
                    }
                    for (var i in allHash) {
                        var type = i;
                        for (var j in allHash[i]) {
                            var id = j;
                            var thisHash = allHash[i][j];
                            hash.addHost(type, id, thisHash.ip, thisHash.port);
                        }
                    }
                    console.log('   [Brain] Reged AT : ' + rec.type, rec.id, rec.ip, rec.port);
                } else {
                    //if you receive a add order that mean a new server join
                    hash.addHost(rec.type, rec.id, rec.ip, rec.port);
                    console.log('   [Brain] New Server : ' + rec.type, rec.id, rec.ip, rec.port);
                }
            } else if (rec.order === 'remove') {
                //remove form hash
                hash.delHost(rec.type, rec.id);
                console.log('   [Brain] Server Dead : ' + rec.type, rec.id, rec.ip, rec.port);
            } else if (rec.order === 'ping') {
                if (rec.data == 'pong') {
                    heartbeatListen(socket);
                }
            }
            exp.rehash();
        });
    }

    //add new server
    //just post to the center a new server joined
    exp.add = function(type, id, ip, port, change) {

        var data = {
            order: 'add',
            type: type,
            id: id,
            ip: ip,
            port: port
        };
        var dataStr = JSON.stringify(data);
        client.write(dataStr);

        callbacks[id] = change;
        fnStack.add = fnStack.add || {};
        fnStack.add[id] = arguments;

    };

    //remove a server
    exp.remove = function() {

    };

    exp.rehash = function() {
        for (var i in callbacks) {
            if (callbacks[i]) callbacks[i]();
        }
    };

    function heartbeat(socket) {
        var data = {
            'order': 'ping',
            'data': 'ping'
        };
        socket.write(JSON.stringify(data));

        clearTimeout(heartId);
        heartId = null;
        heartId = setTimeout(function() {
            socket.destroy();
            console.log('heart is dead')
        }, 2000);
    }

    function heartbeatListen(socket) {
        clearTimeout(heartId);
        heartId = null;
        setTimeout(function() {
            heartbeat(socket);
        }, 10000);
    }

})(brain);

/**
 * @method add
 * @param type
 * @param id
 * @param ip
 * @param port
 */
exports.add = brain.add;
