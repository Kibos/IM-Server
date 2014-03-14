/**
 * 处理流程：
 * 群管理中心，主要功能：为新建立的群分配服务器，通知对应的群sub开始转发该群的消息.
 * 服务器启动顺序：首先group_subscriber.js需要运行。然后再启动group_center.js。消息传递依赖redis服务器。
 */
var redis = require('redis');

/**
 * 获取一个群的所有用户信息（where block flag is false），包括uid，connected
 */
function getGroupUsers (gid) {
	return [];
}

function getAllGroups () {
	return [];
}

function getManagerRedisByGid (gid) {
	return "gm::" + "by hash to get manager id";
}

function GroupCenter () {
	var self = this;
	self.sub = redis.createClient();
	self.pub = redis.createClient();

	self.assign = function(group) {
		self.pub(getManagerRedisByGid(group.id), group.id);
	}

	/**
	 * 遍历所有的群，分配群到不同的group manager
	 */
	var allGroup = getAllGroups();
	for (var i = 0; i < allGroup.length; i++) {
		self.assign(allGroup[i]);
	};

	self.sub.on('message', function(channel, message) {
		if(message.action == "QUIT"){
			self.assign(message.gid);
		}
	});
	self.sub.on('subscribe', function(channel, count) {
	});

	self.sub.subscribe("gcenter");

	/**
	 * 当有新群被创建成功时，这部分工作可以交给php，来pub信息给group manager。
	 */
}