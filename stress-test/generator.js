
module.exports = {
    /**
     * Before connection (optional, just for faye)
     * @param {client} client connection
     */
    beforeConnect : function(client) {
        // Example:
        // client.setHeader('Authorization', 'OAuth abcd-1234');
        // client.disable('websocket');
    },

    /**
     * On client connection (required)
     * @param {client} client connection
     * @param {done} callback function(err) {}
     */
    onConnect : function(client, done) {
        // Faye client
        // client.subscribe('/channel', function(message) { });

        // Socket.io client
//        client.emit('test', { hello: 'world' });
        var host = Math.floor(Math.random()*1000000 + 1);
        client.emit('ybmp','{"order":"REG","host":' + host + ',"access_token":"86bbf005bad4435a31a0854ed933a8a1"}');

        setTimeout(function() {
            client.emit('ybmp','{ "order":"MSG", "poster":' + host + ', "username" :"xiaoming", "userkind":"1", "avatar":"/xx/xx.jpg","touser":10, "type":1, "text":"1321313","image":"/xx/xxx.jpg","access_token":"86bbf005bad4435a31a0854ed933a8a1"}');
        },1000);
//        client.emit('ybmp','{ "order":"MSG", "poster":"181387", "username" :"xiaoming", "userkind":"1", "avatar":"/xx/xx.jpg","togroup":6280, "type":1, "text":"1321313","image":"/xx/xxx.jpg","access_token":"86bbf005bad4435a31a0854ed933a8a1"}');

        // Primus client
        // client.write('Sailing the seas of cheese');

        done();
    },

    /**
     * Send a message (required)
     * @param {client} client connection
     * @param {done} callback function(err) {}
     */
    sendMessage : function(client, done) {
        // Example:
        // client.emit('test', { hello: 'world' });
        // client.publish('/test', { hello: 'world' });
        done();
    }
};
