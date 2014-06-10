'use strict';

var url = require('url');
var query = require('querystring');

var routerStack = {};

function server(req, res) {
    var reqMethod = req.method.toLowerCase();
    var reqUrl = url.parse(req.url);
    var path = reqUrl.pathname;

    var routerPath = routerStack[path];
    var routerFn = routerStack[path] && routerStack[path][reqMethod];
    if (routerPath) {
        if (routerFn) {
            if (reqMethod == 'post') {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    routerFn(req, res, query.parse(data));
                });
            } else if (reqMethod == 'get') {
                routerFn(req, res, query.parse(reqUrl.query));
            } else {
                rep403(req, res);
            }
        } else {
            rep403(req, res);
        }
    } else {
        rep403(req, res);
    }
}

function get(path, option, fn) {
    if (typeof(option) == 'function') {
        fn = option;
    }
    routerStack[path] = routerStack[path] || {};
    routerStack[path].get = fn;
}

function post(path, option, fn) {
    if (typeof(option) == 'function') {
        fn = option;
    }
    routerStack[path] = routerStack[path] || {};
    routerStack[path].post = fn;
}

function rep403(req, res) {
    res.writeHead(403, {});
    res.end('403 Forbidden');
}

exports.server = server;
exports.get = get;
exports.post = post;