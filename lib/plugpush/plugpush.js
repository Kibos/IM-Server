/**
 * this part is mainly to connect other api's
 * plugpush.js
 */
var appInfo = {
    port : 4019,
    type : 'PPush',
    id : 'pp1',
    ip : require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain');
// var hash = require('../hash/hash');
var redis = require('redis');
var conf = require('../../conf/config');

// brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var server = conf.sta.PPSH.pp1;
var client = redis.createClient(server.port, server.ip);

client.on("ready", function() {
    client.subscribe('plugpush');
    client.on('message', function(channel, message) {
        console.log('plugpush',message);
    });
    console.log('[PlugPush] Started, listen redis at ' + server.ip + ':' + server.port)
});

