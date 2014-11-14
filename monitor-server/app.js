
var http = require('http');
var router = require('../dispatch-server/data/router');
var brain = require('../tool/brain.js');
var monitorInfo = {
    ip: process.argv[2],
    port: parseInt(process.argv[3]),
    type: 'MNode',
    id: 'mn_' + process.argv[2] + '_' + process.argv[3]
};

brain.add(monitorInfo.type, monitorInfo.id, monitorInfo.ip, monitorInfo.port);

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