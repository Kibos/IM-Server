var redis = require('redis');
var redisC = redis.createClient(6379, '10.21.3.66');
console.log(redisC.publish('1','2'))
