/*
 * 一致性哈希均匀分布测试 2014-03-12 by xuyuanwei
 */

var Hash = require('../hash/ybhash');

var nodes = [{"id":"m1_1", addr:"10.0.0.1:5001"},{"id":"m1_2", addr:"10.0.0.1:5002"},{"id":"m1_3", addr:"10.0.0.1:5003"}];
var replicas = 80;
console.log("replicas:"+replicas);

var ring = new Hash(nodes, {replicas:replicas});
var time = (new Date()).getTime();
var nodesAddr = {};

for(var i=0; i<100000; i++){
	var node = ring.getNode('Math.random().toString()');
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



// rb tree test:
// var RBTree = require('./hashlib/rbtree');

// var tree = new RBTree(function(a, b) { return a - b; });
// var nodes = [26, 17, 41, 10, 12, 16, 15, 30, 28, 35, 39, 47, 23, 20];
// for (var i = 0; i < nodes.length; i++) {
// 	tree.insert(nodes[i]);
// };
// // tree = tree.insert(23);
// // for (var i = 0; i < 100; i++) {
// // 	tree.insert("a"+i);
// // }

// // console.log(tree.toDot());
// for (var i = 0; i < nodes.length; i++) {
// 	console.log(nodes[i]+":"+tree.upperBound(nodes[i]));
// };

// console.log("555:"+tree.upperBound(555));
