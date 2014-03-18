var brainIp = '10.21.3.62';
var brainPort = 4999;
var net = require('net');
var hash = require('../hash/hash.js');

var brain = {};
(function(exp) {

    var client = new net.Socket();
    client.connect(brainPort, brainIp, function() {
        client.write('REG:::{"host":"2"}');
    });

    client.on('data', function(data) {
        //add to hash
        
        //remove form hash
    });

    client.on('close', function() {
        console.log('Connection closed');
    });
    
    //post to center
    exp.add = function(type, id, ip, port) {
        hash.addHost(type, id, ip, port);
    };
    
    //post to center
    exp.remove = function() {

    };

})(brain)

