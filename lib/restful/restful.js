var http = require('http');
var querystring = require('querystring');
var url = require('url');

function send(options) {
    options['headers'] = options['headers'] || {};
    options['headers']['Content-Type'] = 'application/x-www-form-urlencoded';
    
    var req = http.request(options, function(res) {
        res.on('data', function(data) {
            options.callback && options.callback(data.toString());
        });
    });

    req.write(querystring.stringify(options.data));
    req.end();
}

/**
 *
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

