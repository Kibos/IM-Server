/**
 * Created by 10000489 on 2014/10/29.
 */
var item = ['111:abc', '111:bcd'];
var poster = null;
var messageId = null;
var temp = {};

for(var i = 0 ; i < item.length; i++) {
    poster = item[i].split(':', 2)[0];
    messageId = item[i].split(':', 2)[1];

    if(!temp[poster]) {
        temp[poster] = {};
        temp[poster].messageIds = [];
    }
    temp[poster].messageIds.push(messageId);
    console.log(temp, poster, messageId , item[i], temp[111].messageIds);
}
console.log(temp[111].messageIds)