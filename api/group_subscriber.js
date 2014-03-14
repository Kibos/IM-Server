/**
 * 工作流程 --
 * 	启动之后，获取所有的群组信息。（稍后可修改为各group subscriber manager服务器 
 * 	sub到一个自己的channel，有一个group center，获取所有的群id，然后分发给不同的manager，这样对manager就变成透明。）
 * 	根据一致性哈希来判断该群消息是否需要该manager来处理：
 * 	如果需要的话，那么就new一个GroupSubscriber，来转发该群的所有消息。
 * 	如果不需要的话，直接跳过，会有其他服务器来处理该群的消息。
 */

var redis = require('redis');

function getRedis (rtype, uid) {
	return redis.createClient();
}

function  pushOffline (uid, msg) {
	
}

function GroupSubscriber (gid) {
	this.sub = redis.createClient();

	this.sub.on('message', function(channel, message) {
		// channel name is gid
		var gid = channel.replace("g::", "");
		var groupUsers = [];
		for (var i = 0; i < groupUsers.length; i++) {
			/**
			 * 获取群用户（where block flag is false）
			 */
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

	this.sub.on('subscribe', function(channel, count) {
	});
	this.sub.subscribe('g::' + gid);
}

function isGidSameWithThisManager (gid) {
	// 通过hash来判定该用户是否被分配到这台机器。
	return true;
}

function GroupSubscriberManager () {
	var allGids = [];
	for (var i = 0; i < allGids.length; i++) {
		var gid = allGids[i];
		if(isGidSameWithThisManager(gid)){
			new GroupSubscriber(gid);
		}
	};
}