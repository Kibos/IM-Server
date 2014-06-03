var mongoConnect = require('../mongodb/connect');

exports.setMsg = function(message, touser, poster, option, callback) {
    console.log('set-----------', message)
    var to = touser || message.touser;
    var poster = poster || message.poster;
    var msgid = message.messageId;

    mongoConnect.connect(function(MongoConn) {
        //get the old message
        var collection = MongoConn.db("larvel").collection('Offline');
        var query = {
            "touser": touser,
            "poster": poster
        }
        collection.find(query).toArray(function(err, res) {

            var length = res.length >= 1 ? res[0]['length'] : 0;

            collection.update(query, {
                $push: {
                    "messages": {
                        $each: [msgid],
                        $slice: -10
                    }
                },
                $inc: {
                    length: 1
                }
            }, {
                upsert: true
            }, function() {});
        });

        //offline push
        //message.username,message.groupname
        var username = '';
        var text = '';
        if (message.username) {
            username = message.username
        }
        if (message.togroup) {
            if (username && message.groupname && message.text) {
                text = username + '(' + message.groupname + '):' + message.text;
            } else {
                text = '易班:你收到了一条群组消息';
            }
        } else {
            text = username + (message.text || "易班:你收到了一条消息");
        }
        //message,to,poster
        MongoConn.db("larvel").collection('pushStack').insert({
            'toUser': to,
            'groupId': message.togroup||null,
            'poster': poster,
            'msg': text,
            'time': new Date()
        },function(err,res){})
    });



}

exports.getMsg = function(userid, callback) {
    //get the message
    mongoConnect.connect(function(mongoC) {
        var offMsg = {};
        mongoC.db("larvel").collection('Offline').find({
            "touser": userid
        }).toArray(function(err, result) {
            var totalUser = 0;
            var loadUser = 0;
            for (i in result) {
                var users = result[i]['poster'];
                var msgLen = result[i]['length'];
                offMsg[users] = {};
                offMsg[users]['msg'] = [];
                offMsg[users]['length'] = msgLen;

                totalUser++;
                var messages = result[i]['messages'];
                for (var j = 0, len = messages.length; j < len; j++) {
                    offMsg[users]['msg'].push(messages[j]);
                }
            };

            mongoC.db("larvel").collection('Offline').remove({
                "touser": userid
            }, function() {});

            for (i in offMsg) {
                (function(i) {
                    mongoC.db("larvel").collection('Message').find({
                        "messageId": {
                            $in: offMsg[i]['msg']
                        }
                    }, {
                        "type": 0,
                        "_id": 0
                    }).toArray(function(err, res) {
                        saveMsg(i, res)
                    })
                })(i);
            }

            var offMsgFormat = [];

            function saveMsg(user, msg) {
                loadUser++;

                var temDate = {}
                temDate.userid = user;
                temDate.msg = msg;
                temDate.length = offMsg[user].length;
                offMsgFormat.push(temDate)
                //offMsg[user]['msg'] = msg;
                if (loadUser >= totalUser) {
                    callback && callback(offMsgFormat);
                }
            }

        });
    })
}