/*
 * 工作流程 --
 *    
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