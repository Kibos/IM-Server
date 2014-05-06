var hash = require('../hash/hash.js');
var msgsend = require('../msg/msgsend');

function friend(req, res, json) {
    if (!json.action) return403(req, res, 'action 不能为空');

    if (json.hostid) {
        if (!json.hostname) return403(req, res, 'hostname 不能为空');
        if (!json.hostavatar) return403(req, res, 'hostavatar 不能为空');
    } else if (json.guestid) {
        if (!json.guestname) return403(req, res, 'guestname 不能为空');
        if (!json.guestvatar) return403(req, res, 'guestvatar 不能为空');
    } else {
        return403(req, res, 'json.hostname、json.guestid 不能同时为空');
        return false;
    }


    if ((json.action && json.hostid && json.hostname) || (json.hostavatar && json.guestid && json.guestname)) {
        var touser;
        if (json.action == 'request') {
            //post to the guest as a request
            touser = json.guestid;
        } else {
            //post to the host as a response
            touser = json.hostid;
        }
        msgsend.sys(touser, json);
        return200(req, res, '请求成功');
    }
}

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

exports.friend = friend;