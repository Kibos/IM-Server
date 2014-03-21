var disInfo = {
    type : 'DNode',
    id : 'dn1',
    port : '4008',
    ip : require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain.js');
var http = require('http');
var url = require('url');
var query = require('querystring');
var hash = require('../hash/hash');

http.createServer(function(req, res) {
    
    var reqUrl = url.parse(req['url']);
    if (req['method'].toLowerCase() === 'get' && reqUrl['pathname'] === '/getNode') {
        var search = query.parse(reqUrl['query']);
        var userid = search['userid'];
        if (userid) {
            var nodeJson = hash.getHash('PNode', userid);
            var json = {
                "respnse" : "200",
                "message" : "请求成功",
                "data" : nodeJson
            }

            retJSON(JSON.stringify(json))
        } else {
            ret404();
        }

    } else {

    }

    function retJSON(JSON) {
        res.writeHead(200, {
            'Content-Type' : 'application/json'
        });
        res.end(JSON);
    }

    function ret404() {
        res.writeHead(404, {
            'Content-Type' : 'text/html'
        });
        res.end('404 ');
    }

}).listen(disInfo.port, disInfo.ip);

brain.add(disInfo.type, disInfo.id, disInfo.ip, disInfo.port);

console.log('Dispatch started at ' + disInfo.ip + ':' + disInfo.port)
