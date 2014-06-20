'use strict';
var msgsave = require('./msgsave');

exports.sys = function(msg) {
    msgsave.staMark(msg.messageId, {
        type: 'reach',
        value: true
    });
};