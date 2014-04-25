var appInfo = {
  port : 4009,
  type : 'GNode',
  id : 'gn1',
  ip : require('os').networkInterfaces()['eth0'][0].address
};

var brain = require('../brain/brain');
var hash = require('../hash/hash');
var redis = require('redis');
var ybmp = require('../../api/ybmp');
var redisConnect = require('../redis/connect');
var conf = require('../../conf/config');
var restful = require('../restful/restful');
var ObjectID = require('mongodb').ObjectID
var mongoClient = require('../mongodb/connect');

//add to brain
brain.add(appInfo.type, appInfo.id, appInfo.ip, appInfo.port);

var group = function() {
  return group['init'].apply(this, arguments);
};

(function(exp) {
  exp.conf = {
    group : {},
    msgStack : {}
  }

  exp.init = function() {

    //connect to the redis
    var redisHost = hash.getHash('GRedis', appInfo.id);
    var client = redis.createClient(redisHost.port, redisHost.ip);
    client.on("ready", function() {
      client.on('message', function(channel, message) {
        console.log('   [group message] :' + message)
        var info = JSON.parse(message);
        if (info.order == 'MSG') {
          //send msg
          exp.groupMsg(info);
        } else if (info.order == 'SYS') {
          delete exp.conf.group[info.group];
        }
      });
      client.subscribe('Group.' + appInfo.id);
      console.log('   [Group] listen redis ' + 'Group.' + appInfo.id + '@' + redisHost.ip + ':' + redisHost.port);
    });

  };

  /**
   * @method groupMsg
   * publish group message
   * @param {Object} gId
   * @param {Object} msg
   */
  var temp = 0;

  exp.groupMsg = function(msg) {
    var gId = msg.togroup;
    if (exp.conf.group[gId]) {
      //post
    } else {
      //push to stack list
      exp.conf.msgStack[gId] = exp.conf.msgStack[gId] || {};
      exp.conf.msgStack[gId]['list'] = exp.conf.msgStack[gId]['list'] || [];
      exp.conf.msgStack[gId]['list'].push(msg);
      //get list
      if (exp.conf.msgStack[gId]['sta'] == 'ing') {
        return false
      }
      exp.conf.msgStack[gId]['sta'] = 'ing';

      var options = {
        "hostname" : "10.21.3.59",
        "port" : 8888,
        "path" : "/api/v1/talks/" + gId + "/members?access_token=" + msg.access_token + "&creatorid=" + msg.groupfounder + "&kind=" + msg.kind,
        "callback" : function(Jdata) {
          var data = JSON.parse(Jdata);

          console.log('got data from server', data);

          if (data.response == 100) {
            if (data.data.count > 0) {

              var members = data.data.members;

              console.log('    [Group] http get ', members, ' in ' + gId);

              exp.conf.group[gId] = {};
              for (var i = 0, len = members.length; i < len; i++) {
                exp.conf.group[gId][members[i]['user_id']] = {
                  name : members[i]['username']
                }
              };
              //run the stack MSG
              var stackMsg = exp.conf.msgStack[gId]['list'];
              for (var i = 0, len = stackMsg.length; i < len; i++) {
                exp.groupMsg(stackMsg[i])
              }
              delete exp.conf.msgStack[gId];
              console.log(gId + ' got ', members);
            } else {
              exp.conf.msgStack[gId]['sta'] = '';
              console.log(gId + ' have no user');
            }
          } else {
            exp.conf.msgStack[gId]['sta'] = '';
            console.log('    [Group]', data.response, data.message);
          }
        }
      };

      console.log('---> requerst ', options);

      restful.get(options)
      return false;

    };

    //redisStack
    //catch user's reids
    var redisStack = {};
    for (i in exp.conf.group[gId]) {
      console.log('group user ' + i);
      var user = exp.conf.group[gId][i];

      user.redis = user.redis || hash.getHash('PRedis', i);
      var pRedisId = user.redis['id'];
      redisStack[pRedisId] = redisStack[pRedisId] || {};
      redisStack[pRedisId]['redis'] = redisStack[pRedisId]['redis'] || user.redis;
      redisStack[pRedisId]['users'] = redisStack[pRedisId]['users'] || [];
      redisStack[pRedisId]['users'].push(i);
    }

    //send message to every one
    for (i in redisStack) {
      //asynchronous
      (function(i, redisStack, msg) {
        var host = redisStack[i]['redis'];

        redisConnect.connect(host.port, host.ip, function(client) {
          var users = redisStack[i]['users'];
          var userLen = users.length;
          var pushNum = 0;
          var onlineU = [];
          var offlineU = [];
          for (var j = 0, len = userLen; j < len; j++) {
            (function(j, client, msg) {
              var user = users[j];
              client.sismember('online', user, function(err, res) {
                if (res === 1) {
                  //scoket is online
                  console.log('    [group] user ' + user + ' is online');

                  client.publish('Room.' + user, JSON.stringify(msg));
                  onlineU.push(user);
                } else {
                  //socket is offline
                  console.log('    [group] user ' + user + ' is offline');

                  msg.togroupuser = user;
                  offline(msg);
                  offlineU.push(user);
                }
                pushNum++;
                if (pushNum == userLen) {
                  msg.online = onlineU;
                  msg.offline = offlineU;
                  msg.type = msg.type;
                  messagePushResult(msg);
                  onlineU = null;
                  offlineU = null;
                }
              })
            })(j, client, msg);
          }
        });
      })(i, redisStack, msg)
    };
    //for offline message try to push to the drives
    function offline(msg) {
      if (msg.type === '6') {
        //in group notification we needn't push offline message
        //the other serve will do this .
        return false;
      }
      redisConnect.connect(conf.sta.PPSH.pp1.port, conf.sta.PPSH.pp1.ip, function(client) {
        client.publish('plugpush', JSON.stringify(msg));
      });
    };

    //for group notification
    function messagePushResult(msg) {
      console.log('[group] 6 ：groupNotification ', msg);

      //if the message is group notification we update the database
      mongoClient.connect(function(mongoConnect) {
        var collection = mongoConnect.db("larvel").collection('Notices');

        collection.find({
          "_id" : ObjectID(msg.msgid)
        }).toArray(function(err, res) {
          if (res) {
            var received = res[0]['hasrecieved'].concat(msg.online);
            var unreceived = res[0]['unrecieved'].concat(msg.offline).filter(function(ele) {
              return received.indexOf(ele) == -1
            });

            collection.update({
              "_id" : ObjectID(msg.msgid)
            }, {
              $set : {
                "hasrecieved" : received,
                "unrecieved" : unreceived,
                "status" : 2
              }
            }, function() {

            });
          }

        })
      });

    }

  };
})(group);

group();
