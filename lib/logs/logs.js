'use strict';


var http = require('http');
// { product: 'yiban4_0',
//   platform: 'mobile',
//   module: 'message',
//   action: 'person',
//   time: '1404885266',
//   src_obj: '{"uid":123,"send_txt":"cccc"}',
//   description: 'test',
//   dst_obj: '{}' }
exports.log = function(json, callback) {
    var jsonString = serialize([
        [json]
    ]);
    sendLog(jsonString, callback);
    //test
};

function serialize(mixed_value) {

    var val, key, okey,
        ktype = '',
        vals = '',
        count = 0,
        _utf8Size = function(str) {
            var size = 0,
                i = 0,
                l = str.length,
                code = '';
            for (i = 0; i < l; i++) {
                code = str.charCodeAt(i);
                if (code < 0x0080) {
                    size += 1;
                } else if (code < 0x0800) {
                    size += 2;
                } else {
                    size += 3;
                }
            }
            return size;
        },
        _getType = function(inp) {
            var match, key, cons, types, type = typeof inp;

            if (type === 'object' && !inp) {
                return 'null';
            }

            if (type === 'object') {
                if (!inp.constructor) {
                    return 'object';
                }
                cons = inp.constructor.toString();
                match = cons.match(/(\w+)\(/);
                if (match) {
                    cons = match[1].toLowerCase();
                }
                types = ['boolean', 'number', 'string', 'array'];
                for (key in types) {
                    if (cons == types[key]) {
                        type = types[key];
                        break;
                    }
                }
            }
            return type;
        },
        type = _getType(mixed_value);

    switch (type) {
        case 'function':
            val = '';
            break;
        case 'boolean':
            val = 'b:' + (mixed_value ? '1' : '0');
            break;
        case 'number':
            val = (Math.round(mixed_value) == mixed_value ? 'i' : 'd') + ':' + mixed_value;
            break;
        case 'string':
            val = 's:' + _utf8Size(mixed_value) + ':"' + mixed_value + '"';
            break;
        case 'array':
        case 'object':
            val = 'a';

            for (key in mixed_value) {
                if (mixed_value.hasOwnProperty(key)) {
                    ktype = _getType(mixed_value[key]);
                    if (ktype === 'function') {
                        continue;
                    }

                    okey = (key.match(/^[0-9]+$/) ? parseInt(key, 10) : key);
                    vals += serialize(okey) + serialize(mixed_value[key]);
                    count++;
                }
            }
            val += ':' + count + ':{' + vals + '}';
            break;
            //case 'undefined':
            // Fall-through
        default:
            // if the JS object has a property which contains a null value, the string cannot be unserialized by PHP
            val = 'N';
            break;
    }
    if (type !== 'object' && type !== 'array') {
        val += ';';
    }
    return val;
}


function sendLog(data, callback) {
    var abortTime = 0;

    var options = {
        hostname: '10.21.3.89',
        port: 80,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    var req = http.request(options, function(res) {
        res.on('data', function(c) {
            console.log('log Date: ', c.toString());
        });

        res.on('end', function() {
            if (callback) callback();
            clearTimeout(abortTime);
        });
    });

    req.on('error', function(e) {
        console.log('error', e);
    });

    var str = 'clientID=yiban.cn&passwd=7622f0d078cf468395336320c3cf35a1&module=Logger&func=sysLogger&args=' + data;
    req.write(str);
    req.end();

    abortTime = setTimeout(function() {
        req.abort();
    }, 1000);
}