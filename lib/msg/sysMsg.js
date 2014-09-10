'use strict';
var msgsave = require('./msgsave');

exports.sys = function(msg) {
    //receive callback
    if (msg.action == 'msgReceive') {
        // console.log('[sysMsg.js] msgReceive-->', msg)
        msgsave.staMark(msg.messageId, {
            // type: 'reach',
            // value: true,
            userid: msg.userid
        });
    }
};