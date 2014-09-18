var conf = require('../../conf/config');
var mongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;

var dbStack = {};

/**
 * connect
 * @param  {Function} callback [description]
 * @param  {[type]}   name     [description]
 * @return {[type]}            [description]
 *
 */
<<<<<<< HEAD
//exports.connect = function({ip:xx,port:xx,name:xxx},callback) {
//connect(fn,'a123')
//connect({name:123,ip:123,port:3242},fn)

exports.connect = function(callback, name) {

=======
exports.connect = function(callback, data) {
>>>>>>> bb488c198df4c92677d7ee91dbd22f92973f0990
    var ip = conf.mongodb.mg1.ip;
    var port = conf.mongodb.mg1.port;
    var mongoInfo = {};

    if (typeof callback !== 'function') {
        mongoInfo.ip = callback.ip || ip;
        mongoInfo.port = callback.port || port;
        mongoInfo.name = callback.name || 'default';
    } else {
        mongoInfo.ip = data.ip || ip;
        mongoInfo.port = data.port || port;
        mongoInfo.name = data.name || 'default';
    }

    var conId = mongoInfo.ip.toString() + mongoInfo.port.toString() + mongoInfo.name;
    dbStack[conId] = dbStack[conId] || {};

    if (dbStack[conId].sta == 'ok') {
        if (callback) callback(dbStack[conId].conn);
    } else {
        dbStack.callbacks = dbStack.callbacks || [];
        if (callback) dbStack.callbacks.push(callback);

        if (dbStack[conId].sta !== 'ing') {
            dbStack[conId].sta = 'ing';

            var mongoS = new Server(mongoInfo.ip, mongoInfo.port);
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