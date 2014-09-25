/**
 * Brain.js
 * this file is to connect to the BrainServer,
 * if the brainserver is out of server,it will try to reconnect in each 1000ms
 */
'use strict';

var net = require('net');
var conf = require('../conf/config').NodeInfo.BNode;
var hash = require('./hash/hash.js');

var brain = {};
var brainIp = conf.ip;
var brainPort = conf.port;

(function(exp) {

    var callbacks = {};
    var fnStack = {};
    var client = new net.Socket();
    var reconnect = false;
    var heartId = 0;
    var temp = '';
    var legal = '';

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

    function isLegalData(data) {
        temp += data;
        var left = temp.match(/\{/g);
        var right = temp.match(/\}/g);

        if (left == null || right == null) return false;
        if (left.length == right.length) {
            legal = temp;
            temp = null;
            return true;
        } else {
            return false;
        }
    }

    function datalisten(data, socket) {
        var dataStr = data.toString();
        if (!isLegalData(dataStr)) {
            console.log('brain data is un legal');
            return false;
        }

        var orders = legal.match(/(\{.+?\})(?={|$)/g);
        if (orders == null) {
            return false;
        }
        orders.forEach(function(data) {
            var rec = JSON.parse(data);

            if (rec.order === 'add') {
                if(!isLegalIp(rec.ip)) {
                    console.error('Brain Server IP is unLegal !!!');
                    return false;
                }
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
                    console.log('   [Brain] Reged AT : ' + rec.type, rec.id);
                } else {
                    //if you receive a add order that mean a new server join
                    hash.addHost(rec.type, rec.id, rec.ip, rec.port);
                    console.log('   [Brain] New Server : ' + rec.type, rec.id);
                }
                exp.rehash();
            } else if (rec.order === 'remove') {
                //remove form hash
                hash.delHost(rec.type, rec.id);
                console.log('   [Brain] Server Dead : ' + rec.type, rec.id);
                exp.rehash();
            } else if (rec.order === 'ping') {
                if (rec.data == 'pong') {
                    heartbeatListen(socket);
                }
            }
        });
    }

    socketConnect(datalisten);

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

        //exp.add(type, id, ip, port, change)
        //exp[i].apply(this, fnStack[i][j]);

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

exports.add = brain.add;

function isLegalIp(ip) {
    var legalIp = require('../conf/config').legalIP;

    return ip.match(legalIp.developIp);
}