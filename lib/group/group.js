var appInfo = {
    port : 4009,
    type : 'GNode',
    id : 'gn1',
    ip : require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain');
var hash = require('../hash/hash');
var redis = require('redis');
var ybmp = require('../../api/ybmp');

//add to brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var group = function() {
    return group['init'].apply(this, arguments);
};

(function(exp) {
    exp.conf = {
        group : {
            'G1' : {
                '1' : {
                    name : 'song'
                },
                '2' : {
                    name : 'zhu'
                }
            }
        }
    }
    exp.init = function() {
        //connect to the redis
        var redisHost = hash.getHash('GRedis', appInfo.id);

        var client = redis.createClient(redisHost.port, redisHost.ip);
        client.on("ready", function() {
            client.on('message', function(channel, message) {
                var info = JSON.parse(message);
                if (info.order == 'MSG') {
                    //send msg
                    exp.groupMsg(info);
                }
            });
            client.subscribe('Group.' + appInfo.id);
            console.log('   [Group] listen redis ' + 'Group.' + appInfo.id + '@' + redisHost.ip + ':' + redisHost.port);
        });
    };

    /**
     * @method groupMsg
     * publish group message
     * @param {Object} gId
     * @param {Object} msg
     */
    exp.groupMsg = function(msg) {
        var gId = msg.togroup;
        console.log(msg)
        console.log(exp.conf.group[gId]);
        if (exp.conf.group[msg.togroup]) {
            //post
        } else {
            //get list
        };

        //redisStack
        //catch user's reids
        var redisStack = {};
        for (i in exp.conf.group[gId]) {
            var user = exp.conf.group[gId][i];
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
                        client.publish('Room.' + users[j], JSON.stringify(msg));
                    }
                });
            })(i, redisStack)
        }
    };
})(group);

group();
