var hash = require('../lib/hash/hash');
var redis = require('redis');

var GroupCenter = function() {
    GroupCenter.init.apply(this, arguments);
};

(function(exp) {
    exp.init = function() {
        //get the groups info and add to the server
        exp.getGroups(exp.addAll);

    };

    exp.getGroups = function(callback) {
        //TODO:need the real data
        var data = {
            'G1' : {
                '1' : {
                    name : 'song'
                },
                '2' : {
                    name : 'zhu'
                }
            },
            'G2' : {
                '2' : {
                    name : 'zhu'
                },
                '3' : {
                    name : 'li'
                },
            },
            'G3' : {
                '1' : {
                    name : 'song'
                },
                '2' : {
                    name : 'zhu'
                },
                '3' : {
                    name : 'li'
                },
            }
        }
        //
        callback && callback(data);
    };

    /**
     * @method addAll
     * add all to the group redis,diferent between the add
     * it will compute all the same type,and same the same chennal together
     */
    exp.addAll = function(groups) {
        //conpute the redis servers
        var groupRedis = {}
        for (gname in groups) {
            var redisInfo = hash.getHash('GRedis', gname);
            var rid = redisInfo.id;
            if (!groupRedis[rid]) {
                groupRedis[rid] = {}
                groupRedis[rid]['connection'] = redisInfo;
            }
            groupRedis[rid]['groups'] = groupRedis[rid]['groups'] || {};
            groupRedis[rid]['groups'][gname] = groups[gname];
        }
        //send the groups info to the group menage
        for (i in groupRedis) {
            var redisHost = groupRedis[i]['connection'];
            var client = redis.createClient(redisHost.port, redisHost.ip);
            client.on("ready", function() {
                var groups = groupRedis[i]['groups'];
                client.publish('Gm.' +redisHost['id'], JSON.stringify(groups));
            });
        }

    };

    exp.add = function() {

    };

    exp.remove = function() {

    };
})(GroupCenter);

GroupCenter();
