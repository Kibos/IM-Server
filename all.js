var appInfo = {
  port : 4001,
  type : 'PNode',
  id : 'pn1',
  ip : require('os').networkInterfaces()['eth0'][0].address
}

// var clst = require('clst');
var ybmp = require('./api/ybmp.js');
var redis = require('redis');
var hash = require('./lib/hash/hash.js');
var brain = require('./lib/brain/brain');
var restful = require('./lib/restful/restful');
var config = require('./conf/config');
var redisConnect = require('./lib/redis/connect');
var conf = require('./conf/config');

var mongoConnect = require('./lib/mongodb/connect');

var id = require('./lib/id/id');

var offline = require('./lib/msg/offline');

//start the socket.io
var io = require('socket.io').listen(appInfo.port, {
  log : false
});
////

/**
 * user.mobile
 * user.disktop
 */
var users = {}
////

//add to the brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port, function() {
  for (i in users) {
    //users[host]
    for (j in users[i]) {
      //j is divice
      var isfit = appInfo['id'] == hash.getHash('PNode', i)['id'];
      if (!isfit) {
        var ret = {
          "order" : "DIS",
          "status" : 100,
          "code" : 200,
          "msg" : "服务器异动，该用户已经被分配到其他的服务器，请重新连接至其他的服务器"
        }
        users[i][j]['socket'].emit('ybmp', ret);
        users[i][j]['socket'].disconnect();
      }
    }
  }
});
////

//
io.sockets.on('connection', function(socket) {
  var host;
  var divice;
  var PRedis = {};
  var onLineRedis = null;
  socket.on('ybmp', function(data) {
    var rec = null;
    var time = +new Date();
    var msgId = id.id();

    console.log('----ybmp----')
    console.log('    ', data)
    console.log('----' + time + '----')

    if ( typeof (data) == "string") {
      try {
        rec = JSON.parse(data);
      } catch(e) {
        socket.emit('ybmp', 'wrong data format ：', data);
        return false;
      }
    } else {
      rec = data;
    }

    //case
    if (rec.order == 'REG') {
      //the Reg part
      host = rec.host;
      divice = rec.divice || 'mobile';

      var room = "Room." + rec.host;

      PRedis = hash.getHash('PRedis', rec.host);

      //sub it's room
      redisConnect.sub(PRedis.port, PRedis.ip, room, function(message) {
        try {
          socket.emit('ybmp', JSON.parse(message));
        } catch(e) {
          socket.emit('ybmp', message);
        }
      });

      //reg online status (for single login)

      users[host] = users[host] || {};
      if (users[host][divice]) {
        //if this divice is already regiseted,disconected the old one
        var ret = {
          "order" : "DIS",
          "status" : 200,
          "code" : 200,
          "msg" : host + " 在新的设备 " + (rec.diviceinfo || "未知设备") + " 登陆，您已经被迫下线"
        }
        users[host][divice]['socket'].emit('ybmp', ret);
        users[host][divice]['socket'].disconnect();
      }
      users[host][divice] = users[host][divice] || {};
      users[host][divice]['socket'] = socket;
      users[host][divice]['PRedis'] = PRedis;

      ////

      //mark online
      redisConnect.connect(PRedis.port, PRedis.ip, function(client) {
        onLineRedis = client;
        client.sadd("online", host);
      });

      //let client know the reg result
      var ret = {
        "order" : "REG",
        "status" : 200,
        "room" : room,
        "host" : host
      }
      socket.emit('ybmp', ret);

    } else if (rec.order == 'MSG') {
      console.log('----MSG')
      rec.messageId = msgId;
      //the MSG part
      if (rec.touser) {
        var redisHost = hash.getHash('PRedis', rec.touser);
        var text = rec.text;
        var room = "Room." + rec.touser;
        //connect to the redis
        redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
          rec.status = 200;
          rec.time = time;

          client.publish(room, JSON.stringify(rec));

          if (rec.poster == host) {
            //self replay
            socket.emit('ybmp', rec);
          } else {
            //send to other
            client.sismember('online', rec.touser, function(err, isOnline) {

              console.log('    user ' + rec.touser + ' online status : ' + isOnline);

              if (isOnline) {
                //online
                socket.emit('ybmp', rec);
              } else {
                //offline
                offline.setMsg(rec);

              };
            })
          }

        });

        //log it to server (psersonal msg) async
        var msgData = {
          "type" : "0",
          "from" : rec.poster,
          "to" : rec.touser,
          "content" : rec.text,
          "time" : time,
          "messageId" : rec.messageId
        }
        mongoConnect.connect(function(mongoC) {
          mongoC.db("larvel").collection('Message').insert(msgData, function() {
            //success
          })
        });
      } else if (rec.togroup) {
        var groupServer = hash.getHash('GNode', rec.togroup);
        if (!groupServer) {
          return false;
        }
        var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
        var room = "Group." + groupServer.id;

        redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
          rec.status = 200;
          rec.time = time;
          client.publish(room, JSON.stringify(rec));

          socket.emit('ybmp', rec);
        });

        //log it to server (group msg)
        var msgData = {
          "type" : "1",
          "from" : rec.poster,
          "to" : rec.togroup,
          "content" : rec.text,
          "time" : time,
          "messageId" : rec.messageId
        }

        mongoConnect.connect(function(mongoC) {
          mongoC.db("larvel").collection('Message').insert(msgData, function() {
            //success
          })
        });
        //

      }
    } else if (rec.order == 'OFL') {
      offline.getMsg(rec.userid, function(data) {
        rec.data = data;
        socket.emit('ybmp', rec);
      });
    }
  });

  socket.on('disconnect', function(data) {
    host && console.log(host, ' disa ', data);
    if (users[host] && users[host][divice]) {
      delete users[host][divice];
    }
    if (onLineRedis) {
      onLineRedis.srem("online", host);
    }
  });
});

console.log('   [ NodeServer ] start at ' + appInfo['ip'] + appInfo['port'])
