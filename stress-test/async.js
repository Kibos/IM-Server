var async = require('async');

//var arr = [1, 2, 3];
var temp = {};
temp[1] = {};
temp[1].messageIds = [1, 2, 3];
var result = [];
var count = 3;
var arr = [{poster:1, msg:2}, {poster:2, msg:4}];

async.eachSeries(arr, function(i, callback) {
	async.waterfall([
		function(cb) {
			setTimeout(function () {
				console.log('hello ', i.poster);
				cb(null, i.poster);
			}, 1000);
		}
	], function(err, res) {
		if (err) {
			console.log(err);
		}
		result.push(res);
		count --;
		callback();
	});

}, function(err) {
	if (err) {
		console.log(err);
	}
	if (count === 0) console.log(result);
});