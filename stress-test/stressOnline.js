
//var socket = require('socket.io-client').connect('http://10.21.128.48:4001');
for (var i = 0; i < 1000; i ++) {
    var socket = require('socket.io-client').connect('http://10.21.3.63:4001');

    socket.emit('ybmp','{"order":"REG","host":' + i + ',"access_token":"86bbf005bad4435a31a0854ed933a8a1"}');
    console.log('user : ' + i);
    setTimeout(function() {
        socket.emit('ybmp','{ "order":"MSG", "poster":' + i + ', "username" :"xiaoming", "userkind":"1", "avatar":"/xx/xx.jpg",' +
            '"touser":10, "type":1, "text":"1321313","image":"/xx/xxx.jpg","access_token":"86bbf005bad4435a31a0854ed933a8a1"}');
//        socket.disconnect();
    },1000);
}