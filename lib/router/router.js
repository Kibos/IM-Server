'use strict';

var url = require('url');
var query = require('querystring');

var routerStack = {};

function server(req, res) {
    var reqMethod = req.method.toLowerCase();
    var reqUrl = url.parse(req.url);
    var path = reqUrl.pathname;
    //if the path already regiested and the function is not null;
    var routerPath = routerStack[path];
    var routerFn = routerStack[path] && routerStack[path][reqMethod];
    var option = routerStack[path] && routerStack[path].option;
    if (routerPath) {
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        if (routerFn) {
            //the safe mode
            //if open this mode,only intranet(10.21.xx.xx) can use this servers
            if (option.safe) {
                if (!/^10.21/.test(ip)) {
                    rep403(req, res, 'you have no power to access this server')
                }
            }
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

//reg get 
function get(path, option, fn) {
    if (typeof(option) == 'function') {
        fn = option;
    }
    routerStack[path] = routerStack[path] || {};
    routerStack[path].option = option;
    routerStack[path].get = fn;
}

//reg post
function post(path, option, fn) {
    if (typeof(option) == 'function') {
        fn = option;
    }
    routerStack[path] = routerStack[path] || {};
    routerStack[path].option = option;
    routerStack[path].post = fn;
}

function rep403(req, res, msg) {
    res.writeHead(403, {});
    res.end(msg || '403 Forbidden');
}

exports.server = server;
exports.get = get;
exports.post = post;