var host = {
    ip : '10.21.3.66',
    port : 6379,
    id : 'gr1'
}
//
var hash = require('../lib/hash/hash');
var redis = require('redis');
var redisClient = null;
var groupList = {};
//

var Gm = function() {
    return Gm.init.apply(this, arguments);
};

(function(exp) {

    exp.init = function() {
        //start the server
        var client = redis.createClient(host.port, host.ip);
        client.on("ready", function() {
            redisClient = client;
            client.subscribe('Gm.' + host.id);
            client.on('message', function(channel, message) {
                if (channel == 'Gm.' + host.id) {
                    //the  groupCenter's msg
                    var groups = JSON.parse(message);
                    for (i in groups) {
                        groupList[i] = groups[i];
                        exp.createGroup(i, groups[i])
                    }
                } else {
                    var gid = channel.replace('Group.', '');
                    exp.groupMsg(gid, message);
                }
            });
        });
    };

    exp.createGroup = function(i) {
        redisClient.subscribe('Group.' + i);
    };

    exp.removeGroup = function() {

    };

    exp.groupMsg = function(gId, msg) {
        //redisStack
        var redisStack = {};
        for (i in groupList[gId]) {
            var user = groupList[gId][i];
            user.redis = user.redis || hash.getHash('PRedis', i);
            var pRedisId = user.redis['id'];
            redisStack[pRedisId] = redisStack[pRedisId] || {};
            redisStack[pRedisId]['redis'] = redisStack[pRedisId]['redis'] || user.redis;
            redisStack[pRedisId]['users'] = redisStack[pRedisId]['users'] || [];
            redisStack[pRedisId]['users'].push(i);
        }
        //send message to every one
        for (i in redisStack) {
            //asynchronous
            (function(i, redisStack) {
                var host = redisStack[i]['redis'];
                var client = redis.createClient(host.port, host.ip);
                client.on("ready", function() {
                    var users = redisStack[i]['users'];
                    for (var j = 0, len = users.length; j < len; j++) {
                        client.publish('Room.' + users[j], msg);
                    }
                });
            })(i, redisStack)
        }
    };
})(Gm);
Gm()
//exports.Gm=Gm;