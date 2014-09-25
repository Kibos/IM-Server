var assert = require('assert');
var should = require('should');
var redisConnect = require('../connect/redis');
var token = require('../conf/config').sta.redis.token;

describe('Node server ', function(){

    describe('redis connect ', function() {
        it('is ok ', function(done) {
            redisConnect.connect(token.port, token.ip, function(client) {
                client.select(token.select, function() {
                    client.get('user:181387:mobile:tokenAlias', function(err, res) {
                        should.not.exist(err);
                    });
                });
            });
            done();
        });
    });

    describe('redis sub', function() {
        it('is ok ', function(done) {
            redisConnect.sub(6379, '10.21.3.66', 'Room.10', function(message) {
                console.log(message);

            });
            done();
        });
    });

    describe('reg new or disconnect old ', function(){
        it('is ok ', function() {

        });
    });
});

