var brainIp = '10.21.3.62';
var brainPort = 4999;
var net = require('net');
var hash = require('../hash/hash.js');

var brain = {};
(function(exp) {
    var fn = {};
    var client = new net.Socket();
    client.connect(brainPort, brainIp, function() {
        //console.log(arguments)
    });

    client.on('data', function(data) {
        var rec = JSON.parse(data);
        //add to hash
        if (rec.order === 'add') {
            hash.addHost(rec.type, rec.id, rec.ip, rec.port);
            fn.add && fn.add(JSON.parse(rec.hash));
            fn.add = null;
        } else if (rec.order === 'remove') {
            hash.delHost(rec.type, rec.id)
        } else if (rec.order === 'hashList') {
            fn.hashList && fn.hashList(JSON.parse(rec.data));
        }
        //remove form hash
    });

    client.on('close', function() {
    });

    //post to center
    exp.add = function(type, id, ip, port, callback) {
        var data = {
            order : 'add',
            type : type,
            id : id,
            ip : ip,
            port : port
        };
        dataStr = JSON.stringify(data);

        client.write(dataStr);
        fn.add = callback;
    };

    //post to center
    exp.remove = function() {

    };

    exp.getHashList = function(callback) {
        fn.hashList = callback;
        var data = {
            "order" : 'hashList'
        }
        client.write(JSON.stringify(data));
    };

})(brain)

/**
 * @method add
 * @param type
 * @param id
 * @param ip
 * @param port
 */
exports.add = brain.add;
// 
// brain.add('GRedis', 'rg' + Math.random(), '1.1.1.1', '40', function(data) {
    // console.log(data)
// });

