var hash = require('../hash/hash.js');
var redisConnect = require('../redis/connect');

exports.add = function() {}
exports.remove = function() {}
exports.change = function(req, res, group) {

    var groupServer = hash.getHash('GNode', group.group);
    if (!groupServer) {
        return false;
    }

    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = "Group." + groupServer.id;

    redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
        var rec = {
            order: 'SYS',
            type: 'groupChange',
            group: group.group
        }
        client.publish(room, JSON.stringify(rec));

        res.writeHead(200, {
            'charset': 'UTF-8',
            'Content-Type': 'application/json'
        });
        var endJson = {
            "response": "200",
            "message": "请求成功"
        }
        res.end(JSON.stringify(endJson));
    });
}