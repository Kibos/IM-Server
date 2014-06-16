var hash = require('../hash/hash.js');
var msgsend = require('../msg/msgsend');

/**
 * freind request for client
 **/

function friend(req, res, json) {
    if (!json.action) return403(req, res, 'action 不能为空');
    if (!json.hostid) return403(req, res, 'hostid 不能为空');
    if (!json.guestid) return403(req, res, 'guestid 不能为空');

    if (json.action && json.hostid && json.guestid) {
        var touser;
        if (json.action == 'request') {
            //post to the guest as a request
            touser = json.guestid;
            if (!touser) {
                return403(req, res, 'request 模式下 guestid 不能为空');
                return false;
            }
        } else {
            //post to the host as a response
            touser = json.hostid;
            if (!touser) {
                return403(req, res, 'hostid 不能为空');
                return false;
            }
        }

        msgsend.sys(touser, json);
        return200(req, res, '请求成功');
    } else {
        return403(req, res, '参数错误');
    }
}

/*
 * friends change for system
 */

function friendChange(req, res, json) {
    if (json.type == 'adduser' || json.type == 'removeuser') {
        json.order = 'SYS';
        msgsend.sys(json.user, json);
        return200(req, res, '请求成功');
    } else {
        return403(req, res, 'only "adduser,removeuser" can be use in field "type"');
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

exports.friend = friend;
exports.change = friendChange;