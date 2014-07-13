'use strict';
var appIp = require('os').networkInterfaces().eth0[0].address;
var appPort = 4001;

var appInfo = {
    port: appPort,
    type: 'PNode',
    id: 'pn_' + appIp + '_' + appPort,
    ip: appIp
};

// var clst = require('clst');

var hash = require('./lib/hash/hash.js');
var brain = require('./lib/brain/brain');
var redisConnect = require('./lib/redis/connect');

var offline = require('./lib/msg/offline');
var reg = require('./lib/reg/reg');
var msgsend = require('./lib/msg/msgsend');
var sysMsg = require('./lib/msg/sysMsg');

//start the socket.io
var io = require('socket.io').listen(appInfo.port, {
    log: false
});

/**
 * user.mobile
 * user.disktop
 */
var users = {};
////

//add to the brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port, function() {
    for (var i in users) {
        //users[host]
        for (var j in users[i]) {
            //j is divice
            var isfit = (appInfo.id == hash.getHash('PNode', i).id);
            if (!isfit) {
                var ret = {
                    'order': 'DIS',
                    'status': 200,
                    'code': 200,
                    'msg': '服务器异动，该用户已经被分配到其他的服务器，请重新连接至其他的服务器'
                };
                users[i][j].socket.emit('ybmp', ret);
                console.log(i, '服务器异动，该用户已经被分配到其他的服务器，请重新连接至其他的服务器');
                users[i][j].socket.disconnect();
            }
        }
    }
});
////

//
io.sockets.on('connection', function(socket) {
    var host;
    var divice;

    socket.on('ybmp', function(data) {
        var rec = null;

        console.log('----ybmp----');
        console.log('    ', data);
        console.log('----' + (+new Date()) + '----');

        if (typeof(data) == 'string') {
            try {
                rec = JSON.parse(data);
            } catch (e) {
                socket.emit('ybmp', 'wrong data format : ', data);
                return false;
            }
        } else {
            rec = data;
        }

        //case
        if (rec.order == 'REG') {

            reg.reg(rec, users, socket, function(data) {
                host = data.host;
                divice = data.divice;
            });

        } else if (rec.order == 'MSG') {

            var haveToken = users[host] && users[host][divice] && users[host][divice].token;
            //TODO fix type is 6 or 7
            if ((haveToken && users[host][divice].token == rec.access_token) || rec.type == '6' || rec.type == '7') {
                if (rec.touser) {
                    msgsend.person(rec, socket, {
                        user: users[host]
                    });
                } else if (rec.togroup) {
                    msgsend.group(rec, socket);
                }
            } else {
                rec.status = 100;
                rec.msg = 'token error, please reconnect socket';
                socket.emit('ybmp', rec);
            }
        } else if (rec.order == 'OFL') {
            offline.getMsg(rec.userid, function(data) {
                rec.data = data;
                rec.status = 200;
                socket.emit('ybmp', rec);
            });
        } else if (rec.order == 'DIS') {
            var ret = {
                'order': 'DIS',
                'status': 200,
                'code': 300,
                'msg': '用户主动离线'
            };
            socket.emit('ybmp', ret);
            console.log(host, '用户主动离线');
            socket.disconnect();
        } else if (rec.order == 'SYS') {
            rec.userid = rec.userid || host;
            sysMsg.sys(rec);
        }
    });

    socket.on('disconnect', function(data) {
        if (host) console.log(host, ' disa ', data);

        if (users[host] && users[host][divice]) {
            delete users[host][divice];
        }

        if (host) {
            var PRedis = hash.getHash('PRedis', host);
            redisConnect.connect(PRedis.port, PRedis.ip, function(client) {
                client.srem('online', host);
            });
        }

    });
});

console.log('   [ NodeServer ] start at ' + appInfo.ip + appInfo.port);