var assert = require("assert");
var cluster = require('cluster');
var userid = 8;
var usertoken = 'd84910041d138935b504f371719280a4';
var userid2 = 9;
var usertoken2 = 'd84910041d138935b504f371719280a4';

var io = require('socket.io-client');
var socket = io.connect('http://10.21.3.62:4001');


describe('REG', function() {
    it('login as ' + userid, function(done) {
        var passed = false;

        socket.on('ybmp', function(data) {
            if (data.order == "REG" && data.host == userid && passed != true) {
                passed = true;
                assert.equal(200, data.status);
                done()
                test()
            }
        })

        socket.on('connect', function() {
            socket.emit('ybmp', {
                "order": "REG",
                "host": userid,
                "access_token": usertoken
            })
        });
    });
});

function test() {
    describe('GroupMessage', function() {
        it('GroupMessage', function(done) {
            var passed = false;
            socket.on('ybmp', function(data) {
                if (passed) {
                    return false;
                }
                passed = true;
                assert.equal(200, data.status);
                done()
            })

        })
    })
}