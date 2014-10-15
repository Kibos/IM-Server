
var http = require('http');
var router = require('../dispatch-server/data/router');
var monitorInfo = require('../conf/config').NodeInfo.MNode;

router.get('/monitor', function(req, res, NodeInfo) {
    if (!NodeInfo.ip || !NodeInfo.port) {
        ret403(req, res, 'NodeInfo is wrong, For example: 10.21.3.63:4001');
    }

    require('../tool/monitor').MonitorPub(res, NodeInfo);
});

function ret403(req, res, msg) {
    if (!res) {
        return false;
    }
    res.writeHead(403, {
        'Content-Type': 'application/json'
    });
    res.end('{"response" : "403","message":"' + (msg || '') + '"}');
}

http.createServer(function(req, res) {
    router.server(req, res);
}).listen(monitorInfo.port, monitorInfo.ip);

console.log('Monitor started at ' + monitorInfo.ip + ':' + monitorInfo.port);