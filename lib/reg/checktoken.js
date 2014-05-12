var redisConnect = require('../redis/connect');
var conf = require('../../conf/config');

exports.check = function(id, token, callback) {
    redisConnect.connect(conf.sta.redis.token.port, conf.sta.redis.token.ip, function(client) {
        client.select(conf.sta.redis.token.select, function(err, res) {
            client.get('user:' + id + ':tokenAlias', function(err, res) {
                var checked = token === res ? true : false;
                if (callback) {
                    if (!checked) {
                        console.log('redis -->', conf.sta.redis.token.port, conf.sta.redis.token.ip, conf.sta.redis.token.select);
                        console.log('checktoken.js-->', id, token, res);
                    }
                    callback(checked);
                }
            });
        });
    });
};