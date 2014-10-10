'use strict';
var appInfo = require('../conf/config.js').NodeInfo.PNode1;
var hash = require('../tool/hash/hash.js');
var brain = require('../tool/brain.js');
var redisConnect = require('../connect/redis.js');
var reg = require('./data/reg.js');
var offline = require('../tool/msg/offline.js');
var msgsend = require('../tool/msg/msgsend.js');
var sysMsg = require('../tool/msg/sysMsg.js');
var redis = require('redis');

//start the socket.io
var io = require('socket.io').listen(appInfo.port, {
    log: false
});

/**
 * user.mobile
 * user.disktop
 */
var users = {};
var messageCount = {
    group: 0,
    person: 0
};
//auto logo sys info
(function saveUserInfo() {
    var fs = require('fs');
    var filename = '/usr/local/app/www/logs/' + appInfo.ip + '_' + appInfo.port + '_pn_' + new Date().toJSON().split('T')[0] + '.txt';
    var total = 0;
    var userArray = [];

    for (var i in users) {
        for (var j in users[i]) {
            userArray.push(i + '@' + j);
            total++;
        }
    }

    var json = {
        onlineCount: total,
        onlineUsers: userArray.join(','),
        personMessage: messageCount.person,
        groupMessage: messageCount.group,
        time: +new Date()
    };

    fs.writeFile(filename, JSON.stringify(json) + '\n', {
        flag: 'a'
    }, function(err) {
        if (err) {
            console.log(arguments);
        }
    });

    setTimeout(function() {
        saveUserInfo();
    }, 45000);
})();

//add to the brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port, function() {
    console.log('hashs', hash._hash());
    console.log('*****************');

    for (var i in users) {
        //users[host]
        for (var j in users[i]) {
            //j is divice
            var hashId = hash.getHash('PNode', i).id;
            var isfit = appInfo.id == hashId;

            if (!isfit) {
                var ret = {
                    'order': 'DIS',
                    'status': 200,
                    'code': 200,
                    'msg': '服务器异动，该用户已经被分配到其他的服务器，请重新连接至其他的服务器',
                    'serverId': appInfo.id,
                    'hashId': hashId
                };
                users[i][j].socket.emit('ybmp', ret);
                users[i][j].socket.disconnect();

                console.log(i, appInfo.id, hash.getHash('PNode', i).id, '服务器异动，该用户已经被分配到其他的服务器，请重新连接至其他的服务器');
                console.log('hashs', hash._hash());
                console.log(ret);
                console.log('*****************');
            }
        }
    }
});

//Monitoring Communications (subscribe)
require('../tool/monitor').MonitorSub(appInfo);

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

        if (rec.order == 'REG') {

            reg.reg(rec, users, socket, function(data) {
                if (!data) console.log('[node][app]client reg false');
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
                    messageCount.person++;
                } else if (rec.togroup) {
                    msgsend.group(rec, socket);
                    messageCount.group++;
                }
            } else {
                rec.status = 100;
                rec.msg = 'token error, please reconnect socket';
                console.log('[node server][send msg]token err, haveToken is ', haveToken);
                socket.emit('ybmp', rec);
            }
        } else if (rec.order == 'OFL') {
            if (rec.action == "person") {
                offline.getMoreByPerson(rec.userid, rec.poster, rec.limit, function(data) {
                    rec.data = data;
                    rec.status = 200;
                    socket.emit('ybmp', rec);
                });
            } else {
                offline.getMsg(rec.userid, function(data) {
                    rec.data = data;
                    rec.status = 200;
                    socket.emit('ybmp', rec);
                });
            }
        } else if (rec.order == 'DIS') {
//            var ret = {
//                 'order': 'DIS',
//                 'status': 200,
//                 'code': 300,
//                 'msg': '用户主动离线'
//            };
//            socket.emit('ybmp', ret);
            console.log(host, '用户主动离线');
            socket.disconnect();
        } else if (rec.order == 'SYS') {
            rec.userid = rec.userid || host;
            sysMsg.sys(rec);
        } else {
            console.error('###############' + new Date() + " socket io is falsed");
        }
    });

    socket.on('disconnect', function(data) {
        if (!host) {
            console.log('[nodeServer][socket disconnect] userid: ', host);
            return false;
        }
        console.log('[nodeServer][socket disconnect] userid: ', host, ' dis reason: ', data);

        if (users[host] && users[host][divice]) {
            delete users[host][divice];
        }

        var PRedis = hash.getHash('PRedis', host);
        redisConnect.connect(PRedis.port, PRedis.ip, function(client) {
            client.srem('online', host);
        });
    });
});

console.log('   [ NodeServer ] start at ' + appInfo.ip + ':' + appInfo.port);