var hash = require('../hash/hash.js');
var redisConnect = require('../redis/connect');

exports.add = function() {
}
exports.remove = function() {
}
exports.change = function(group, callback) {

  var groupServer = hash.getHash('GNode', group.group);
  if (!groupServer) {
    return false;
  }

  var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
  var room = "Group." + groupServer.id;

  redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
    var rec = {
      order : 'SYS',
      type : 'groupChange',
      group : group.group
    }
    client.publish(room, JSON.stringify(rec));
    callback && callback();
  });
}
