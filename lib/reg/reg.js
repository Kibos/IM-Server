/**
 * for new user to reg
 */
var hash = require('../hash/hash');
var redisConnect = require('../redis/connect');

exports.reg = function(rec, users, socket, callback) {

  var host = rec.host;
  var divice = rec.divice || 'mobile';

  var room = "Room." + host;
  var PRedis = hash.getHash('PRedis', host);
  
  //TODO check the accesstoken

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
    var throwdata = {
      "host" : host,
      "divice" : divice
    }
    callback && callback(throwdata)
  });

  //let client know the reg result
  var ret = {
    "order" : "REG",
    "status" : 200,
    "room" : room,
    "host" : host
  }
  socket.emit('ybmp', ret);
}
