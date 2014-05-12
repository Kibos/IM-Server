var disInfo = {
    type: 'DNode',
    id: 'dn1',
    port: '4201',
    ip: require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain.js');
var http = require('http');
var url = require('url');
var query = require('querystring');
var hash = require('../hash/hash');
var redisC = require('../redis/connect');

var group = require('./dispatch_group');
var notification = require('./dispatch_notification');
var friend = require('./dispatch_friend');

http.createServer(function(req, res) {

    var reqUrl = url.parse(req['url']);
    var reqMethod = req['method'].toLowerCase();

    console.log(reqMethod, ':', reqUrl['pathname'], new Date());

    if (reqMethod === 'get' && reqUrl['pathname'] === '/getNode') {
        //get node server
        var search = query.parse(reqUrl['query']);
        var userid = search['userid'];
        if (userid) {
            var nodeJson = hash.getHash('PNode', userid);
            //TEMPLETE FIXED
            if (/10\.21\.67\.\d{1,3}$/.test(nodeJson.ip)) {
                nodeJson.ip = '112.65.235.26';
                nodeJson.addr = nodeJson.ip + ':' + nodeJson.port;
            }
            //
            var json = {
                "response": "200",
                "message": "请求成功",
                "data": nodeJson
            }
            retJSON(JSON.stringify(json));
        } else {
            ret404();
        }
    } else if (reqMethod === 'post' && reqUrl['pathname'] === '/notification') {
        //group group notification
        var data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = query.parse(data);
            console.log('notification', json)
            if (json.noti_type == 'group') {
                if (/^(request|accept|refused)$/.test(json.action)) {
                    group.group(req, res, json);
                } else {
                    notification.group(req, res, json);
                }
            } else if (json.noti_type == 'person') {
                notification.person(req, res, json);
            } else if (json.noti_type == 'friend') {
                friend.friend(req, res, json);
            } else {
                res.writeHead(403, {});
                res.end('403 Forbidden');
            };
        })
    } else if (reqMethod === 'put' && reqUrl['pathname'] === '/groupChange') {
        //group member change
        var data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            var json = query.parse(data);
            if (json.group) {
                group.change(req, res, json);
            } else {
                ret404('group is necessary');
                return false;
            }

        });

    } else {
        res.writeHead(403, {});
        res.end('403 Forbidden');
    }

    function retJSON(JSON) {
        res.writeHead(200, {
            'charset': 'UTF-8',
            'Content-Type': 'application/json'
        });
        res.end(JSON);
    }

    function ret404(msg) {
        res.writeHead(404, {
            'Content-Type': 'application/json'
        });
        res.end('{"response" : "404","message":"' + msg + '"}');
    }

}).listen(disInfo.port, disInfo.ip);

brain.add(disInfo.type, disInfo.id, disInfo.ip, disInfo.port);

console.log('Dispatch started at ' + disInfo.ip + ':' + disInfo.port)
