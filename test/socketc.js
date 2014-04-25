var net=require('net')
var client = new net.Socket();
client.connect(4999, '10.21.3.62', function() {
    console.log('ok-----', arguments)
}); 

