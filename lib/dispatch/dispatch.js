'use strict';

var appPort = 4008;
var appIp = require('os').networkInterfaces().eth0[0].address;

var disInfo = {
    type: 'DNode',
    id: 'dn_' + appIp + '_' + appPort,
    port: appPort,
    ip: appIp
};

var brain = require('../brain/brain.js');
var http = require('http');
var hash = require('../hash/hash');
var msgsend = require('../msg/msgsend');

var group = require('./dispatch_group');
var notification = require('./dispatch_notification');
var friend = require('./dispatch_friend');

var router = require('../router/router');

//getNode(GET)
router.get('/getNode', function(req, res, search) {
    var userid = search.userid;
    if (userid) {
        var nodeJson = hash.getHash('PNode', userid);
        //TEMPLETE FIXED
        if (/10\.21\.67\.\d{1,3}$/.test(nodeJson.ip)) {
            nodeJson.ip = '112.65.235.55';
            nodeJson.addr = nodeJson.ip + ':' + nodeJson.port;
        }
        var json = {
            'response': '200',
            'message': 'request success',
            'data': nodeJson
        };
        retJSON(req, res, JSON.stringify(json));
    } else {
        ret403(req, res, 'userid is necessary');
    }
});

//notification(POST)
router.post('/notification', function(req, res, json) {
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    console.log('notification', json, ip);
    if (json.noti_type == 'group') {
        if (/^(request|accept|refused|groupPull|groupKick)$/.test(json.action)) {
            //group member info
            group.group(req, res, json);
        } else {
            //group message
            notification.group(req, res, json);
        }
    } else if (json.noti_type == 'share_group') {
        notification.shareGroup(req, res, json);
    } else if (json.noti_type == 'person') {
        notification.person(req, res, json);
    } else if (json.noti_type == 'friend') {
        friend.friend(req, res, json);
    } else {
        ret403(req, res, 'noti_type is Invalid');
    }
});

//groupChange(POST)
router.post('/groupChange', function(req, res, json) {
    console.log('groupChange', json, json.type, json.action);
    //group member change
    if (json.group) {
        if (/^\bGMemberAdd\b$|^\bGMemberRemove\b$|^\bGCreaterChange\b$/.test(json.type || json.action)) {
            group.change(req, res, json);
        } else {
            ret403(req, res, 'type only can be "GMemberAdd|GMemberRemove|bGCreaterChange"');
        }
    } else {
        ret403(req, res, 'group is necessary');
        return false;
    }
});

//friendChange(POST)
router.post('/friendChange', function(req, res, json) {
    console.log('[disopatch friendChange] ---->', json);
    //group member change
    friend.change(req, res, json);
});

//blacklist(POST)
router.post('/blacklist', function(req, res, json) {
    require('./dispatch_block').block(req, res, json);
});

//messages(POST)
router.post('/messages', {
    safe: true
}, function(req, res, json) {
    console.log('messages', json);

    if (json.action == 'PMenuResponse' || json.action == 'PMessage') {
        if (!json.tousers || !json.poster || !json.userkind) {
            ret403(req, res, 'tousers,poster,userkind is necessary');
        } else {
            json.order = 'MSG';

            if (json.action == 'PMenuResponse') {
                json.type = json.type || '11';
            }
            delete json.action;

            var users = json.tousers.split(',');
            //var tonkes = json.tousersToken.split(',');
            for (var i = 0, len = users.length; i < len; i++) {
                delete json.tousers;
                json.touser = users[i];
                msgsend.sendToPerson(json, users[i], json.poster);
                delete json.touser;
            }
            retJSON(req, res, JSON.stringify({
                'response': '200',
                'message': 'messages send success'
            }));
        }
    } else {
        ret403(req, res, 'action is wrong, more information : http://10.21.118.240/wiki/doku.php?id=notification#%E6%8E%A8%E9%80%81%E4%B8%AA%E4%BA%BA%E6%B6%88%E6%81%AF_messages');
    }
});

//messages(POST)
router.post('/explore', {
    safe: true
}, function(req, res, json) {
    if (/^((exploreComment)|(exploreStar)|(exploreBury))$/.test(json.action)) {
        if (json.touser) {
            msgsend.sys(json.touser, json);
            retJSON(req, res, JSON.stringify({
                'response': '200',
                'message': 'messages send success'
            }));
        } else {
            res.writeHead(403, {
                'Content-Type': 'application/json'
            });
            res.end('touser is necessary,more information: http://10.21.118.240/wiki/doku.php?id=notification&#%E7%A4%BA%E4%BE%8B');
        }
    } else {
        res.writeHead(403, {
            'Content-Type': 'application/json'
        });
        res.end('action is out of expected,more information: http://10.21.118.240/wiki/doku.php?id=notification&#%E7%A4%BA%E4%BE%8B');
    }
});

router.post('/lightApp', {
    safe: true
}, function(req, res, json) {
    if (!json.touser || !json.appId) {
        ret403(req, res, 'tousers or appId is necessary');
    }
    if (json.action !== 'lightAppNew') {
        ret403(req, res, 'action is wrong, more information : http://http://10.21.118.240/wiki/doku.php?id=notification&#轻应用推送请求');
    }

    msgsend.sys(json.touser, json);
    retJSON(req, res, JSON.stringify({
        'response': '200',
        'message': 'messages send success'
    }));
});

function retJSON(req, res, JSON) {
    if (!res) {
        return false;
    }
    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    res.end(JSON);
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

http.createServer(function(req, res) {
    router.server(req, res);
}).listen(disInfo.port, disInfo.ip);

brain.add(disInfo.type, disInfo.id, disInfo.ip, disInfo.port);

console.log('Dispatch started at ' + disInfo.ip + ':' + disInfo.port);