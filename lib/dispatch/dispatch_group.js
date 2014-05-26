var hash = require('../hash/hash.js');
var redisConnect = require('../redis/connect');
var msgsend = require('../msg/msgsend');

exports.add = function() {};
exports.remove = function() {};
exports.change = function(req, res, group) {

    var groupServer = hash.getHash('GNode', group.group);
    if (!groupServer) {
        return false;
    }

    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = "Group." + groupServer.id;

    redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
        group.order = 'SYS';
        client.publish(room, JSON.stringify(group));

        res.writeHead(200, {
            'charset': 'UTF-8',
            'Content-Type': 'application/json'
        });
        var endJson = {
            "response": "200",
            "message": "请求成功"
        };
        res.end(JSON.stringify(endJson));
    });
};

exports.group = function(req, res, json) {

    if (!json.action) return403(req, res, 'action 不能为空');
    if (!json.hostid) return403(req, res, 'hostid 不能为空');
    // if (!json.hostname) return403(req, res, 'hostname 不能为空');
    // if (!json.hostavatar) return403(req, res, 'hostavatar 不能为空');
    if (!json.groupid) return403(req, res, 'groupid 不能为空');
    if (!json.groupname) return403(req, res, 'groupname 不能为空');
    if (!json.creatorid) return403(req, res, 'creatorid 不能为空');
    // if (!json.creatorname) return403(req, res, 'creatorname 不能为空');
    // if (!json.creatoravatar) return403(req, res, 'creatoravatar 不能为空');

    if (json.action && json.hostid && json.groupid && json.groupname && json.creatorid) {
        var touser;
        if (json.action == 'request') {
            //post to the guest as a request
            touser = json.creatorid;
        } else {
            //post to the host as a response
            touser = json.hostid;
        }
        msgsend.sys(touser, json);
        return200(req, res, '请求成功');
    }
};

function return403(req, res, info) {
    res.writeHead(403, {
        'Content-Type': 'application/json'
    });
    var endJson = {
        sta: 403,
        msg: info || '403'
    };
    res.end(JSON.stringify(endJson));
}

function return200(req, res, info) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    var endJson = {
        sta: 200,
        msg: '发送成功'
    };
    res.end(JSON.stringify(endJson));
}

//