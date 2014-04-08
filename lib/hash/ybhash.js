/*
 * 一致性哈希实现 2014-03-12 by xuyuanwei
 */

var crypto = require('crypto');
var RBTree = require('./rbtree');


var YbHash = function(nodes, options) {
  /*
   * 参数Nodes的格式为 [{"id":"m1_1", addr:"10.0.0.1:5001"}]
   * tree 保存所有的虚拟结点对应的哈希值
   */
  this.replicas  = 100; // 每台物理结点对应的虚拟结点的个数，数量越多，分布的越均匀，但是会影响查找性能，不过使用红黑树，可以保证时间复杂度是log(n)。
  this.algorithm = 'md5'
  this.tree  = new RBTree(function(a, b) { 
    return a.localeCompare(b);
  }); 
  this.nodes = {};
  this.ring = {}; // key是虚拟结点的哈希值，value是node的name

  if (options && options.replicas)  this.replicas  = options.replicas;
  if (options && options.algorithm) this.algorithm = options.algorithm;

  for (var k in nodes) {
    this.addNode(nodes[k]);
  }
};


YbHash.prototype.addNode = function(node) {
  this.nodes[node.id] = node;

  for (var i = 0; i < this.replicas; i++) {
    var key = this.crypto((node.id || node) + ':' + i);
      this.tree.insert(key);
      this.ring[key] = node.id;
  }
};


YbHash.prototype.removeNode = function(node) {
  for (var i = 0; i < this.replicas; i++) {
    var key = this.crypto((node.id || node) + ':' + i);
    delete this.ring[key];
    this.tree.remove(key);
  }
  delete this.nodes[node.id];
};


YbHash.prototype.getNode = function(key) {
  if (this.getRingLength() == 0) return 0;

  var hash = this.crypto(key);
  var vnodeHash  = this.tree.floor(hash);

  return this.nodes[this.ring[vnodeHash]];
};



YbHash.prototype.getRingLength = function() {
  return Object.keys(this.ring).length;
};


YbHash.prototype.crypto = function(str) {
  return crypto.createHash(this.algorithm).update(str).digest('hex');
};


module.exports = YbHash;
