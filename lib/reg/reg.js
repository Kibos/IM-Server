/**
 * reg is for new user to reg
 */
var hash = require('../hash/hash');

function reg(rec,socket) {
    //the Reg part
    var host = rec.host;

    var room = "Room." + rec.host;

    PRedis = hash.getHash('PRedis', rec.host);

    //connect to the redis
    var client = redis.createClient(PRedis.port, PRedis.ip);
    PRedis.connection = client;
    onLineRedis = redis.createClient(PRedis.port, PRedis.ip);

    client.on("ready", function() {
        //TODO:if the redis is disconnected by any reason,what will you do?

        //set redis online
        onLineRedis.sadd("online", host);
        //

        client.on('message', function(channel, message) {
            try {
                socket.emit('ybmp', JSON.parse(message));
            } catch(e) {
                socket.emit('ybmp', message);
            }
        });
        client.subscribe(room);
        //return
        var ret = {
            "order" : "REG",
            "status" : 200,
            "room" : room,
            "host" : host
        }
        socket.emit('ybmp', ret);

    });
}

