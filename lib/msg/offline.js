var mongoConnect = require('../mongodb/connect');

exports.setMsg = function(message, callback) {
  console.log('set-----------', message)
  var to = message.touser;
  var poster = message.poster;
  var msgid = message.messageId;

  mongoConnect.connect(function(MongoConn) {
    //get the old message
    var collection = MongoConn.db("larvel").collection('Offline');

    collection.update({
      "touser" : to,
      "poster" : poster
    }, {
      $push : {
        "messages" : {
          $each : [msgid],
          $slice : -10
        }
      }
    }, {
      upsert : true
    }, function() {
    });

  });
}

exports.getMsg = function(userid, callback) {
  //get the message
  mongoConnect.connect(function(mongoC) {
    var offMsg = {};
    mongoC.db("larvel").collection('Offline').find({
      "touser" : userid
    }).toArray(function(err, result) {
      var totalUser = 0;
      var loadUser = 0;
      for (i in result) {
        var users = result[i]['poster'];
        totalUser++;
        var messages = result[i]['messages'];
        offMsg[users] = [];
        for (var j = 0, len = messages.length; j < len; j++) {
          offMsg[users].push(messages[j]);
        }
      };

      mongoC.db("larvel").collection('Offline').remove({
        "touser" : userid
      },function(){});

      for (i in offMsg) {
        (function(i) {
          mongoC.db("larvel").collection('Message').find({
            "messageId" : {
              $in : offMsg[i]
            }
          }, {
            "type" : 0,
            "_id" : 0
          }).toArray(function(err, res) {
            saveMsg(i, res)
          })
        })(i);
      }

      function saveMsg(user, msg) {
        loadUser++;
        offMsg[user] = msg;
        if (loadUser >= totalUser) {
          callback && callback(offMsg);
        }
      }

    });
  })
}
