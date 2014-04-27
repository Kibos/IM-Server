var conf = require('../../conf/config');
var mongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;

var dbStack = {};

exports.connect = function(callback) {

    var ip = conf.mongodb.mg1.ip;
    var port = conf.mongodb.mg1.port;

    var conId = ip.toString() + port.toString();
    dbStack[conId] = dbStack[conId] || {};

    if (dbStack[conId].sta == 'ok') {
        if (callback) callback(dbStack[conId].conn);
    } else {
        dbStack.callbacks = dbStack.callbacks || [];
        if (callback) dbStack.callbacks.push(callback);
        if (dbStack[conId].sta !== 'ing') {
            dbStack[conId].sta = 'ing';

            var mongoS = new Server(ip, port);
            var mongoC = new mongoClient(mongoS, {
                native_parser: true
            });

            mongoC.open(function(err, mongoclient) {
                if (err) {
                    console.log('cant open the mongodb');
                    delete dbStack[conId];
                } else {
                    dbStack[conId].conn = mongoC;
                    dbStack[conId].sta = 'ok';
                    for (var i in dbStack.callbacks) {
                        dbStack.callbacks[i](mongoC);
                    }
                    dbStack.callbacks = [];
                }
            });
        }

    }
};