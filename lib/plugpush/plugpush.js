/**
 * this part is mainly to push messages to other http api's
 * plugpush.js
 */
var appInfo = {
  port : 4019,
  type : 'PPush',
  id : 'pp1',
  ip : require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain');
var redis = require('redis');
var conf = require('../../conf/config');
var restful = require('../restful/restful');

// brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var server = conf.sta.PPSH.pp1;
var client = redis.createClient(server.port, server.ip);

client.on("ready", function() {
  client.subscribe('plugpush');
  client.on('message', function(channel, msg) {
    console.log('---plugpush---')
    console.log(msg)
    var msgO = JSON.parse(msg);
    //this is the gruop notification
    if (msgO.type === "groupNotification") {
      var options = {
        hostname : '10.21.3.59',
        port : 8888,
        path : '/api/v1/groups/notice/' + msgO.msgid,
        data : {
          access_token : msgO.access_token || '',
          hasrecieved : msgO.online.join(',') || '',
          unrecieved : msgO.offline.join(',') || ''
        },
        callback : function(data) {
          console.log(data);
        }
      };
      console.log('---->', options);
      restful.put(options);
    }
  });
  console.log('[PlugPush] Started, listen redis at ' + server.ip + ':' + server.port)
});

