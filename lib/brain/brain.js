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
            if (rec.self) {
                var allHash = JSON.parse(rec.hash);
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
                hash.addHost(rec.type, rec.id, rec.ip, rec.port);
            }
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

    exp.add = function(type, id, ip, port) {
        var data = {
            order : 'add',
            type : type,
            id : id,
            ip : ip,
            port : port
        };
        dataStr = JSON.stringify(data);
        client.write(dataStr);
    };

    //post to center
    exp.remove = function() {

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


