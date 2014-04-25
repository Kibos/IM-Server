var redis = require('redis');

var client = redis.createClient('6379', '10.21.3.66');
client.on("ready", function() {
    // client.sadd("onlie", "1");
    // client.sadd("onlie", "2");
    // client.sadd("onlie", "2");
    // client.sadd("onlie", "3");
    //SISMEMBER 
    // console.log('--')
    // client.spop('online');
    // client.sismember("onlie","2",function(err,rep){
        // console.log(rep)
    // })
    // console.log('--')
    client.srem('onlie',"1",function(){
        console.log(arguments)
    })
    client.smembers("onlie",function(err,rep){
         console.log(rep)
    })
});