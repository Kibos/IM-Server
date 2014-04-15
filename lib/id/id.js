var os = require('os');
var crypto = require('crypto');
var countTemp = 0;

//get the os hash
function oshash() {
  var shasum = crypto.createHash('sha1');
  shasum.update(os.hostname());
  return shasum.digest('hex').slice(-8);
}

//get the time
function time() {
  var data = +new Date();
  return data.toString(36);
}

//get the pid
function pid() {
  var result = '';
  var pidS = process.pid.toString();
  if (pidS.length < 6) {
    for (var i = 0, len = (6 - pidS.length ); i < len; i++) {
      result += '0'
    }
    return result + pidS
  };
}

//get the count
function count() {
  var countTen = parseInt(countTemp, 36);
  countTemp = (++countTen).toString(36);
  if (countTemp >= 'zzzzzz') {
    countTemp = 0;
  }

  var result = '';
  if (countTemp.length < 6) {
    for (var i = 0, len = (6 - countTemp.length ); i < len; i++) {
      result += '0'
    }
  };

  return result + countTemp;
}

exports.id = function() {
  return time() + oshash() + pid() + count();
}
