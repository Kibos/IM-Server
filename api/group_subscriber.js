/**
 * 工作流程 --
 * 	启动之后，获取所有的群组信息。（稍后可修改为各group subscriber manager服务器 
 * 	sub到一个自己的channel，有一个group center，获取所有的群id，然后分发给不同的manager，这样对manager就变成透明。）
 * 	根据一致性哈希来判断该群消息是否需要该manager来处理：
 * 	如果需要的话，那么就new一个GroupSubscriber，来转发该群的所有消息。
 * 	如果不需要的话，直接跳过，会有其他服务器来处理该群的消息。
 */

var redis = require('redis');

/**
 * 根据服务器类型和用户的id，来获取该用户的个人redis服务器
 */
function getRedis (rtype, uid) {
	return redis.createClient();
}

function pushOffline (uid, msg) {
	
}

/**
 * 群中心redis服务器
 */
var groupCenterRedis = redis.createClient();//redis.createClient(1213, "group center redis ip");

function getGroupCenterRedis () {
	return groupCenterRedis;
}

function GroupSubscriber (gid) {
	var self = this;
	self.gid = gid;
	self.sub = redis.createClient();

	/**
	 * 群消息转发
	 */
	self.sub.on('message', function(channel, message) {
		// channel name is gid
		var gid = channel.replace("g::", "");
		var groupUsers = getGroupUsers(gid);
		for (var i = 0; i < groupUsers.length; i++) {
			var user = groupUsers[i];
			if(user.connected){
				// 对于在线用户，消息直接推送到用户的channel。
				var msg = JSON.stringify({action: 'control', user: current.user, msg: ' joined the channel' });
				getRedis("predis",user.id).publish(user.id, msg);
			}
			else{
				// 对于离线用户，消息进入存储通道，保存七天，直到用户读取再删除。
				pushOffline(user.id, msg);
			}
		};
	});

	self.sub.on('subscribe', function(channel, count) {
	});
	self.sub.subscribe('g::' + gid);

	self.quit = function() {
		self.sub.unsubscribe('g::' + self.gid);
		if (self.sub !== null) self.sub.quit();
		return self.gid;
	}
}

function isGidSameWithThisManager (gid) {
	// 通过hash来判定该用户是否被分配到这台机器。
	return true;
}

function GroupSubscriberManager () {
	var self = this;
	self.sub = getGroupCenterRedis();
	var groupDict = {};

	self.sub.on('message', function(channel, message) {
		if(message == "COMMAND_CHANGE"){
			/**
			 * 如果是接到了服务器变动的消息，就需要本服务器重新计算哪些群已经不在本进程伺服中。
			 */
			self.managerChanged();
			return;
		}
		var gid = message;
		groupDict[gid] = new GroupSubscriber(gid);
	});
	self.sub.on('subscribe', function(channel, count) {
	});

	self.sub.subscribe('gm::' + "this server ip and port");

	/**
	 * group manager集群发生变动
	 */
	self.managerChanged = function() {
		for (var gid in groupDict) {
			if(!isGidSameWithThisManager(gid)){
				groupDict[gid].quit();
				/**
				 * 在退出时，需要发消息给群center，让群center来进行调度安排。
				 */
				var msg = JSON.stringify({action: 'QUIT', gid : gid });
				getGroupCenterRedis().publish("gcenter", msg);
			}
		};
	}
}