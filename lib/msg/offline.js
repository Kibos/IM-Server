var conf=require('../../conf/config');



//mongodb part
var mongoS = new Server("10.21.3.59", 27017);
var mongoC = new mongoClient(mongoS, {
    native_parser : true
});
var mongoLarvel = null;
mongoC.open(function(err, mongoclient) {
    if (err) {
        console.log('cant open the mongodb');
    } else {
        mongoLarvel = mongoC.db("larvel");
    }
});
////mongodb part end

exports.set;
exports.get;