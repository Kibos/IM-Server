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
var redisC = require('../redis/connect');

http.createServer(function(req, res) {

    var reqUrl = url.parse(req['url']);

    //get node server
    if (req['method'].toLowerCase() === 'get' && reqUrl['pathname'] === '/getNode') {
        var search = query.parse(reqUrl['query']);
        var userid = search['userid'];
        if (userid) {
            var nodeJson = hash.getHash('PNode', userid);
            var json = {
                "response" : "200",
                "message" : "请求成功",
                "data" : nodeJson
            }

            retJSON(JSON.stringify(json));

        } else {
            ret404();
        }

    } else if (req['method'].toLowerCase() === 'post' && reqUrl['pathname'] === '/notification') {
        var data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = query.parse(data);
            console.log(json)
            if(!json.togroup){
                ret404('group is necessary')
            }
            var groupServer = hash.getHash('GNode', json.togroup);
            if (!groupServer) {
                return false;
            }
            var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
            var room = "Group." + groupServer.id;

            redisC.connect(groupRedis.port, groupRedis.ip, function(client) {
                json.status = 200;
                client.publish(room, JSON.stringify(json));
            });
            retJSON(JSON.stringify(json));
        })
    }

    function retJSON(JSON) {
        res.writeHead(200, {
            'charset' : 'UTF-8',
            'Content-Type' : 'application/json'
        });
        res.end(JSON);
    }

    function ret404(msg) {
        res.writeHead(404, {
            'Content-Type' : 'application/json'
        });
        res.write(msg);
        res.end('{"response" : "404"}');
    }

}).listen(disInfo.port, disInfo.ip);

brain.add(disInfo.type, disInfo.id, disInfo.ip, disInfo.port);

console.log('Dispatch started at ' + disInfo.ip + ':' + disInfo.port)
