'use strict';
/**
 * for new user to reg
 */
var hash = require('../../tool/hash/hash');
var redisConnect = require('../../connect/redis');
var checkToken = require('./checktoken');

exports.reg = function(rec, users, socket, callback) {

    var host = rec.host;
    if (!host) {
        console.error('[reg][reg] parameters error, host:', host);
        callback(host);
        return false;
    }
    var divice = rec.divice || 'mobile';
    var room = 'Room.' + host;
    var PRedis = hash.getHash('PRedis', host);
    var accessToken = rec.access_token;

    checkToken.check(host, accessToken, divice, function(res) {
        if (res) {
            //access token correct
            checkSuccess();
        } else {
            //access token wrong
            var ret = {
                'order': 'REG',
                'status': 100,
                'msg': 'access_token error'
            };
            socket.emit('ybmp', ret);
        }
    });

    function checkSuccess() {
        //sub it's room
        redisConnect.sub(PRedis.port, PRedis.ip, room, function(message) {
            if (users[host]) {
                for (var i in users[host]) {
                    var socket = users[host][i].socket;
                    try {
                        if (socket) socket.emit('ybmp', JSON.parse(message));
                    } catch (e) {
                        if (socket) socket.emit('ybmp', message);
                    }
                }
            }
        });

        //reg online status (for single login)
        regOnline(users, rec, host, divice, accessToken, PRedis, socket);

        //mark online
        redisConnect.connect(PRedis.port, PRedis.ip, function(client) {
            client.select('0', function() {
                client.sadd('online', host);
            });

            var throwdata = {
                'host': host,
                'divice': divice
            };
            if (callback) callback(throwdata);
        });

        //let client know the reg result
        socket.emit('ybmp', {'order': 'REG', 'status': 200, 'room': room, 'host': host});
    }
};

function regOnline(users, rec, host, divice, accessToken, PRedis, socket) {
    var ret;

    users[host] = users[host] || {};
    //TODO develop
    if (users[host][divice]) {
        //if this divice is already regiseted,disconected the old one
        var time = new Date();
        ret = {
            'order': 'DIS',
            'status': 200,
            'code': 300,
            'msg': '您的帐号已于[最后次登录时间（' + time.getHours() + ':' + time.getMinutes() + '）]在其他地方登入，' +
                '登入设备是[' + (rec.diviceinfo || '未知设备') + ']，若不是您本人操作，您的密码可能泄露，' +
                '建议重置密码或联系易班客服',
            'time': +time,
            'diviceinfo': rec.diviceinfo
        };
        users[host][divice].socket.emit('ybmp', ret);
        console.log(host + ' 在新的设备 ' + (rec.diviceinfo || '未知设备') + ' 登陆，您已经被迫下线');
        users[host][divice].socket.disconnect();
    }
    users[host][divice] = users[host][divice] || {};
    users[host][divice].token = accessToken;
    users[host][divice].socket = socket;
    users[host][divice].PRedis = PRedis;
}