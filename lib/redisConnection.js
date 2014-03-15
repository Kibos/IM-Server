var redis = require('redis');
var config = require('../conf/config');

exports.connect = function(data, callback) {
    console.log('*********', data)
    var reidsIp = config.redis.servers[0];
    var room = 'Room.'+da;
    console.log(reidsIp)
    //get the user's redis server ip,and get the user's channel
    var client = redis.createClient(6379, config.redis.servers[0]);
    //var client = redis.createClient(6379, '10.21.3.66');

    client.on("ready", function() {
        callback && callback({
            connection : client,
            room : room
        });
    });
}
