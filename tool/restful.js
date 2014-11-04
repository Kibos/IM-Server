var http = require('http');
var querystring = require('querystring');
var url = require('url');

function send(options) {
    options['headers'] = options['headers'] || {};
    options['headers']['Content-Type'] = 'application/x-www-form-urlencoded';

    var req = http.request(options, function(res) {
        var returnData = '';
        res.on('data', function(data) {
            returnData += data.toString();
        });
        res.on('end', function() {
            options.callback && options.callback(returnData);
        });
        res.on('error', function(data) {
            console.log('[error restful.js] connect ' + options.hostname + options.path + ' error');
        });
    });

    req.write(querystring.stringify(options.data));
    req.end();
}

/**
 * var options = {
 *    hostname: 'www.google.com',
 *    port: 80,
 *    path: '/upload',
 *    method: 'POST'
 *  };
 */
exports.get = function(options) {
    options.method = 'get';
    send(options);
};
exports.post = function(options) {
    options.method = 'post';
    send(options);
};
exports.put = function(options) {
    options.method = 'put';
    send(options);
};
exports.del = function(options) {
    options.method = 'delete';
    send(options);
};