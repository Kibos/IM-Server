'use strict';

var hash = require('../hash/hash.js');
var redisConnect = require('../redis/connect');
var msgsend = require('../msg/msgsend');

exports.add = function() {};
exports.remove = function() {};

exports.change = function(req, res, group) {

    group.order = 'SYS';
    group.action = group.action || group.type || 'groupChange';
    group.togroup = group.group;
    delete group.group;
    msgsend.group(group);

    //let user konw
    if (group.action == 'GMemberRemove') {
        var date = {
            'noti_type': 'group',
            'action': 'groupKick',
            'groupid': group.togroup ,
            'userids': group.member
            //hostid,hostname,hostavatar,groupid,groupinfo,userids,attach
        }
        var userids = (group.member || '').split(',');
        for (var i = 0, len = userids.length; i < len; i++) {
            console.log(userids[i], date)
            msgsend.sys(userids[i], date);
        }
    }
    //

    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    var endJson = {
        'response': '200',
        'message': '请求成功'
    };
    res.end(JSON.stringify(endJson));


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
    } else if (json.action == 'groupPull' || json.action == 'groupKick') {
        if (!json.userids) {
            return403(req, res, 'userids 不能为空，API URL：http://10.21.118.240/wiki/doku.php?id=ybmp&#%E7%BE%A4%E7%BB%84%E8%AF%B7%E6%B1%82');
            return false;
        }
        var userids = json.userids.split(',');
        for (var i = 0, len = userids.length; i < len; i++) {
            msgsend.sys(userids[i], json);
        }
        console.log(json.action, json.userids.toString());
        return200(req, res, '发送成功，用户id：' + json.userids.toString());
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