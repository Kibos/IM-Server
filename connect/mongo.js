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

exports.connect = function(callback, data) {

    if (typeof callback !== 'function') {
        var tempCallback = typeof data == 'object' ? data : {
            name: data
        };
        var tempData = callback;
        data = tempCallback;
        callback = tempData;
    }

    if (!data.ip || !data.port || !data.name) {
        console.error('[mongodb connect] parameters error');
    }
    var callbacks;
    var ip = data.ip;
    var port = data.port;
    var name = data.name || 'default';

    var conId = ip.toString() + port.toString() + name;

    dbStack[conId] = dbStack[conId] || {};

    if (dbStack[conId].sta == 'ok') {
        if (callback) callback(dbStack[conId].conn);
    } else {
        dbStack[conId].callbacks = dbStack[conId].callbacks || [];
        if (callback) dbStack[conId].callbacks.push(callback);

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
                    for (var i in dbStack[conId].callbacks) {
                        dbStack[conId].callbacks[i](mongoC);
                    }
                    dbStack[conId].callbacks = [];
                }
            });
        }

    }
};