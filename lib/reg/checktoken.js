var redisConnect = require('../redis/connect');
var conf = require('../../conf/config');

exports.check = function(id, token, callback) {
  redisConnect.connect(conf.sta.redis.token.port, conf.sta.redis.token.ip, function(client) {
    client.select(conf.sta.redis.token.select, function(err, res) {
      client.get('userTokenAlias_' + id, function(err, res) {
        var checked = token === res ? true : false;
        if (callback) {
          if (!checked) {
            console.log('checktoken.js-->',id, token, res);
          }
          callback(checked);
        }
      });
    });
  });
};