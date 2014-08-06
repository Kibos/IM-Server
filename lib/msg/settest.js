var redisClient = require('../redis/connect');
var conf = require('../../conf/config');

var redisPort = conf.sta.redis.cache.port;
var redisIp = conf.sta.redis.cache.ip;

redisClient.connect(redisPort, redisIp, function(client) {
    client.select('2', function(err, res) {
        client.sadd("uid", {
            "aa1": 1,
            "aa2": 2
        });
        client.del('uid', function(err, res) {
            console.log('AAA',res);
            client.smembers('uid', function(err, res) {
                console.log('BBB',res)
            })
        })

    });
});