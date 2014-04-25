var http = require('http');
var querystring = require('querystring');

var options = {
    hostname : '10.21.3.59',
    port : 8090,
    path : '/api/v1/message/group',
    method : 'post',
    headers : {
        'Content-Type' : 'application/x-www-form-urlencoded'
    }
};

var postD = querystring.stringify({
    "name" : "asdfsa",
    "creator" : "1123"
});

for(var i=0;i<1000;i++){
var req = http.request(options, function(res) {
    res.on('data', function(data) {
        console.log(data.toString());
    });
});

req.write(postD);
req.end();
}
