exports.getMsg = function(userid, callback) {
    userid = parseInt(userid);
    var result = [];
    var totalUser = 0;
    var loadUser = 0;
    mongoConnect.connect(function(mongoC) {
        var Offline = mongoC.db(mg1.dbname).collection('Offline');
        Offline.find({
            'userid': userid
        }).toArray(function(err, res) {
                if (err || res.length <= 0) {
                    if (callback) callback(result);
                } else {
                    for (var i in res[0]) {
                        if (!res[0][i].total || !res[0][i].messages) continue;
                        getByPerson(i, res[0][i]);
                    }
                }

                Offline.remove({
                    'userid': userid
                }, function(err) {
                    if (err) {
                        console.log("[offline][getMsg] remove false");
                        return false;
                    }
                });
            });
    }, {ip: mg1.ip, port: mg1.port, name: 'Offline_getmsg'});

    function getByPerson(i, res) {
        totalUser++;
        var theObj = {
            userid: i,
            length: res.total
        };

        getRealMsg(res.messages, userid, function(res) {
            theObj.msg = res;
            result.push(theObj);
            if (++loadUser >= totalUser) {
                if (callback) callback(result);
            }
        });
    }

    //remove the push count
    mongoConnect.connect(function(MongoConn) {
        MongoConn.db(mg2.dbname).collection('PushCache').remove({
            'touser': parseInt(userid)
        }, function(err) {
            if (err) {
                console.log("[offline][getMsg] remove false");
                return false;
            }
        });
    }, {ip: mg2.ip, port: mg2.port, name: 'offline_get'});
};