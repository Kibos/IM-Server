var net = require('net');

//

function Pubsub(socket) {
    this.socket = socket;
    this.channelCallback = {};
}
Pubsub.prototype = {
    'pub': function(channel, data) {
        if (!channel || !data) throw new Error('method pub --> channel and data is necessary');
        var Json = {
            'type': 'pub',
            'channel': channel,
            'data': data
        };
        this.socket.write(JSON.stringify(Json));
        return this;
    },
    'sub': function(channel, callback) {
        if (!channel || !callback) throw new Error('method sub --> channel and callback is necessary');
        var Json = {
            'type': 'sub',
            'channel': channel
        };
        var writeDate = this.socket.write(JSON.stringify(Json));
        if (writeDate) this.channelCallback[channel] = callback;
        return this;
    },
    'unsub': function(channel) {
        if (!channel) throw new Error('method unsub --> channel is necessary');
        var Json = {
            'type': 'unsub',
            'channel': channel
        };
        var writeDate = this.socket.write(JSON.stringify(Json));
        delete this.channelCallback[channel];
        return this;
    },
    'end': function() {
        this.socket.end();
        return this;
    },
    'constructor': Pubsub
};
//

exports.connect = function(ip, port, callback) {
    var client = new net.Socket();
    var pubsubClient = new Pubsub(client);

    client.connect({
        host: ip,
        port: port
    });

    client.on('connect', function() {
        if (callback) callback(pubsubClient);
    });

    client.on('error', function(err) {
        console.log('connect error', err);
    });

    client.on('data', function(data) {
        var dataStr = data.toString();
        var orders = dataStr.match(/(\{.+?\})(?={|$)/g);

        if (orders) orders.forEach(function(data) {

            var dataJson = JSON.parse(data);
            console.log(dataJson);
            var channel = dataJson.channel;
            var callback = pubsubClient.channelCallback[channel];

            if (callback) callback(dataJson.data);

        });
    });

    client.on('end', function() {});
};

//
var ip = require('os').networkInterfaces().eth0[0].address;

exports.connect(ip, 5544, function(socket) {
    socket.sub('abc1', function(data) {
        console.log('1: sub data', data);
    });
    socket.sub('abc2', function(data) {
        console.log('2: sub data', data);
    });
    socket.sub('abc3', function(data) {
        console.log('3: sub data', data);
    });
    setTimeout(function() {
        socket.unsub('abc2');
    }, 2000);
});
setTimeout(function() {
    exports.connect(ip, 5544, function(socket) {
        socket.pub('abc1', '1asd');
        socket.pub('abc2', '23asd');
        socket.pub('abc3', '3asd');
    });
}, 500);
setTimeout(function() {
    console.log('----')
    exports.connect(ip, 5544, function(socket) {
        socket.pub('abc2', '123asd');
    });
}, 3000);

///
///