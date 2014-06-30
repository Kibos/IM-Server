'use strict';
var msgsave = require('./msgsave');

exports.sys = function(msg) {
	//receive callback
    if (msg.action == 'msgReceive') {
        msgsave.staMark(msg.messageId, {
            type: 'reach',
            value: true
        });
    }
};