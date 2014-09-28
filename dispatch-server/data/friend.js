'use strict';

var msgsend = require('../../tool/msg/msgsend');

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
    if (!json.touser) {
        return403(req, res, 'touser is necessary, see : http://10.21.118.240/wiki/doku.php?id=groupchange&#%E5%88%A0%E9%99%A4%E5%A5%BD%E5%8F%8B');
        return false;
    }
    if (!json.user) {
        return403(req, res, 'user  is necessary, see : http://10.21.118.240/wiki/doku.php?id=groupchange&#%E5%88%A0%E9%99%A4%E5%A5%BD%E5%8F%8B');
        return false;
    }

    json.order = 'SYS';
    msgsend.sys(json.touser, json);
    return200(req, res, '请求成功');

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
        msg: info || '发送成功'
    };
    res.end(JSON.stringify(endJson));
}

exports.friend = friend;
exports.change = friendChange;