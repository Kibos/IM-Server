//var mongodb = require('../connect/mongo');
//
//mongodb.connect(function(mongoC) {
//    console.log('22222222222222');
//    for (var i = 0; i < 10; i++) {
//        mongoC.db('test').collection('Message').insert({
//            'message': 'hello world!'
//        }, function(err) {
//            if (err) console.log('err',err);
//            console.log('*')
//        });
//    }
//    console.log('10 done');
//}, {ip: '10.21.3.64', port: 27017, name: 'test'});

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://10.21.3.64:27017/test';

MongoClient.connect(url, function(err, mongoC) {
    setInterval(function(){
        for (var i = 0; i < 100000; i ++) {
            mongoC.collection('Message').insert({
                'message': 'hello world!'
            }, function(err) {
                if (err) console.log('err',err);
                console.log('*');
            });
        }
    }, 10000);
});

