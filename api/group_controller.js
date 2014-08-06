 var redis = require("redis");

var allRedisServer = ["10.0.0.1:1000","10.0.0.2:1000","10.0.0.3:1000"];
function GroupController(redisNodes){
	this.redisClient = {};
	var init = function () {
		for (var i = 0; i < redisNodes.length; i++) {
			this.addRedis(redisNodes[i]);
		};
	}

	init();
}

GroupController.prototype.addRedis = function(node) {
	this.redisClient[node] = redis.createClient(6379, '127.0.0.1');
};

GroupController.prototype.removeRedis = function(node) {
	if(node in this.redisClient){
		this.redisClient[node].quit();
		delete this.redisClient[node];
	}
};

GroupController.prototype.getRedis = function(node) {
	if(node in this.redisClient){
		return this.redisClient[node];
	}
	return null;
};

GroupController.prototype.getChannelByRedis = function(channel) {
	var server = function () {
		return channel+"by hash";
	}
	return this.getRedis(server);
};

GroupController.prototype.publish = function(channel, msg) {
	var redis = this.getChannelByRedis(channel);
	if(redis != null){
		redis.publish(channel, msg);
	}
}