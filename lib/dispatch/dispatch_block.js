'use strict';

function block(req, res, json) {
	console.log('[dispatch_block] -->',json)
    if (!json.touser) {
        ret403(req, res, 'touser is necessary!');
    }
    if (!json.poster) {
        ret403(req, res, 'poster is necessary!');
    }
    if (!json.access_token) {
        ret403(req, res, 'access_token is necessary!');
    }
    if (!json.action) {
        ret403(req, res, 'action is necessary!');
    }

    require('../msg/msgsend').sys(json.touser, json);

    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    retJSON(req, res, {
        'sta': 200,
        'msg': "发送成功"
    });
}

function retJSON(req, res, json) {
    if (!res) {
        return false;
    }
    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(json));
}

function ret403(req, res, msg) {
    if (!res) {
        return false;
    }
    res.writeHead(403, {
        'Content-Type': 'application/json'
    });
    res.end('{"response" : "403","message":"' + (msg || '') + '"}');
}

exports.block = block;