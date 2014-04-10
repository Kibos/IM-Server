var brainIp = '10.21.3.62';
var brainPort = 4999;
var net = require('net');
var hash = require('../hash/hash.js');

var brain = {};

(function(exp) {

    var callbacks = {};
    var fnStack = {};
    var client = new net.Socket();
    var reconnect = false;

    function socketConnect(callback) {

        client.connect(brainPort, brainIp);

        if (reconnect) {
            return false;
        }

        client.on('connect', function() {
            if (reconnect) {
                for (var i in fnStack) {
                    for (var j in fnStack[i]) {
                        exp[i].apply(this, fnStack[i][j]);
                    }
                }
            }
        });

        client.on('data', callback);

        client.on('close', function() {
            reconnect = true;
            console.log('client close');
            setTimeout(function() {
                socketConnect(callback);
            }, 1000);
        });

        client.on('error', function() {
            reconnect = true;
            console.log('client error');
            setTimeout(function() {
                socketConnect(callback);
            }, 1000);
        });
    };

    socketConnect(datalisten);

    function datalisten(data) {
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
                    if ( typeof (rec.hash) !== 'object') {
                        allHash = JSON.parse(rec.hash);
                    }
                    for (i in allHash) {
                        var type = i;
                        for (j in allHash[i]) {
                            var id = j;
                            var thisHash = allHash[i][j]
                            hash.addHost(type, id, thisHash.ip, thisHash.port);
                        }
                    }
                    console.log('   [Brain] Reged AT : ' + rec.type, rec.id, rec.ip, rec.port)
                } else {
                    //if you receive a add order that mean a new server join
                    hash.addHost(rec.type, rec.id, rec.ip, rec.port);
                    console.log('   [Brain] New Server : ' + rec.type, rec.id, rec.ip, rec.port);
                }
            } else if (rec.order === 'remove') {
                //remove form hash
                hash.delHost(rec.type, rec.id);
                console.log('   [Brain] Server Dead : ' + rec.type, rec.id, rec.ip, rec.port);
            }
            exp.rehash();
        });
    }

    //add new server
    //just post to the center a new server joined
    exp.add = function(type, id, ip, port, change) {

        var data = {
            order : 'add',
            type : type,
            id : id,
            ip : ip,
            port : port
        };
        dataStr = JSON.stringify(data);
        client.write(dataStr);

        callbacks[id] = change;
        fnStack['add'] = fnStack['add'] || {};
        fnStack['add'][id] = arguments;

    };

    //remove a server
    exp.remove = function() {

    };

    exp.rehash = function() {
        for (i in callbacks) {
            callbacks[i] && callbacks[i]();
        }
    }
})(brain)

/**
 * @method add
 * @param type
 * @param id
 * @param ip
 * @param port
 */
exports.add = brain.add;
// brain.add('test','test5','1.1.1.1','500')
// brain.add('test','test6','1.1.1.1','500')
// brain.add('test','test7','1.1.1.1','500')
// brain.add('test','test8','1.1.1.1','500')
// brain.add('test','test9','1.1.1.1','500')//

