var redisConnect = require('../../connect/redis');
var token = require('../../conf/config').sta.redis.token;

var ip = token.ip;
var port = token.port;
var select = token.select;

exports.check = function(id, token, divice, callback) {
    redisConnect.connect(port, ip, function(client) {
        client.select(select, function(err, res) {
            client.get('user:' + id + ':' + divice + ':tokenAlias', function(err, res) {
                var checked = (token === res);
                if (!checked) {
                    console.log('redis -->', port, ip, select);
                    console.log('checktoken.js-->', id, token, res);
                }
                if (callback) callback(checked);
            });
        });
    });
};