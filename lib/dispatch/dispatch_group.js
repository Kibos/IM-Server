'use strict';

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
    group.action = group.type;

    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = 'Group.' + groupServer.id;

    redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
        group.order = 'SYS';
        group.action = 'groupChange';
        client.publish(room, JSON.stringify(group));

        res.writeHead(200, {
            'charset': 'UTF-8',
            'Content-Type': 'application/json'
        });
        var endJson = {
            'response': '200',
            'message': '请求成功'
        };
        res.end(JSON.stringify(endJson));
    });
};

exports.group = function(req, res, json) {

    if (!json.action) return403(req, res, 'action 不能为空');
    if (!json.hostid) return403(req, res, 'hostid 不能为空');

    if (/^(request|accept|refused)$/.test(json.action)) {
        if (!json.groupid) return403(req, res, 'groupid 不能为空');
        if (!json.groupname) return403(req, res, 'groupname 不能为空');
        if (!json.creatorid) return403(req, res, 'creatorid 不能为空');

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
    } else if (json.action == 'groupPull') {
        if (!json.users) return403(req, res, 'users 不能为空，API URL：http://10.21.118.240/wiki/doku.php?id=ybmp&#%E7%BE%A4%E7%BB%84%E8%AF%B7%E6%B1%82');
        var users = json.users.split(',');
        for (var i = 0, len = users.length; i < len; i++) {
            msgsend.sys(users[i], json);
        }
        return200(req, res, '发送成功，用户id：' + json.users.toString());
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
        msg: info || '发送成功'
    };
    res.end(JSON.stringify(endJson));
}
