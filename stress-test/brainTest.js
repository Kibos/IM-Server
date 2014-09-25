var appIp = '10.21.128.48';var appIp = require('os').networkInterfaces().eth0[0].address;
var appPort = 4001;
var brain = require('./../lib/brain/brain');
var hash = require('./../lib/hash/hash.js');

var appInfo = {
    port: appPort,
    type: 'PNode',
    id: 'pn_' + appIp + '_' + appPort,
    ip: appIp
};

console.log('This is a shit!!! -> - -!');

for (var i = 0; i < 5; i++) {
    brain.add(appInfo.type, appInfo.id + '_' + i, appInfo.ip, appInfo.port + i, function() {
        console.log('<<<<<<<<<<<<<<<hash ', hash._hash().PNode + '>>>>>>>>>>>>>>>>');
    });
}