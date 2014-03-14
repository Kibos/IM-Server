/* Region: 服务器类型配置及服务器ip port配置*/
function ServerNode (id, ip, port) {
	port = port || 0;
	return {id : id, ip : ip, port : port, addr : (ip + ":" + port)};
}

var replicas = 80;
var ServerSettings = {
	PNode : [ServerNode("pn1", "127.0.0.1", 8080), ServerNode("pn2", "127.0.0.1", 8081)],
	PRedis : [ServerNode("pr1", "127.0.0.1", 4040), ServerNode("pr2", "127.0.0.1", 4041)],
	GSub : [ServerNode("gs1", "127.0.0.1"), ServerNode("gs2", "127.0.0.1")],
	GRedis : [ServerNode("pr1", "127.0.0.1", 4040), ServerNode("pr2", "127.0.0.1", 4041)],
	URedis : [ServerNode("pr1", "127.0.0.1", 4040), ServerNode("pr2", "127.0.0.1", 4041)]
}

var ServerType = (function () {
	var type = {};
	for(var p in ServerSettings){
		type[p] = p;
	}
	return type;
})();

/* Endregion*/
var Hash = require('../lib/hash/ybhash');

var ServerFactory = (function () {
    var instantiated;
    function init() {
        /*
         * public methods
         */
        // 根据服务器配置，初始化所有的hash node
        var serverHashs = {};
        for (var p in ServerSettings) {
        	serverHashs[p] = new Hash(ServerSettings[p], {replicas:replicas});
        };
        return {
            getServerHash: function (stype) {
            	if(stype in this.serverHashNodes){
            		return this.serverHashNodes[stype];
            	}
                return null;
            },
            serverHashNodes: serverHashs
        };
    }

    return {
        getInstance: function () {
            if (!instantiated) {
                instantiated = init();
            }
            return instantiated;
        }
    };
})();

// for test

function getHash(stype, value){
	var ring = ServerFactory.getInstance().getServerHash(stype);
	return ring.getNode(value);
}

var time = (new Date()).getTime();
var nodesAddr = {};

for(var i=0; i<100000; i++){
	var node = getHash(ServerType.PRedis, 'a'+i+'b'+i+"c"+i);
	if(node in nodesAddr){
		nodesAddr[node]++;
	}
	else{
		nodesAddr[node] = 1;	
	}
}
for (var k in nodesAddr) {
	console.log(nodesAddr[k]+":"+k);	
}
console.log('Time: '+((new Date()).getTime() - time)/100+' s');