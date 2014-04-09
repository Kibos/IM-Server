var net = require('net');


var client = new net.Socket();
client.connect(4000, '10.21.3.62', function() {
    // 建立连接后立即向服务器发送数据，服务器将收到这些数据
    client.write('REG:::{"host":"2"}');

});

// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
client.on('data', function(data) {

    console.log('DATA: ' + data);
    // 完全关闭连接
    //client.destroy();

});

// 为客户端添加“close”事件处理函数
client.on('close', function() {
    console.log('Connection closed');
});
