var memwatch = require('memwatch');
memwatch.gc();
var hd = new memwatch.HeapDiff();
var a = function() {};

var hde = hd.end();

//var hde = require('../node-server/app').hde;
//console.log(JSON.stringify(hde, null, 2));




