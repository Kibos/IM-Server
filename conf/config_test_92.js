/**
 * mongodb
 */
exports.mongodb = {
    // the defaulte mongodb
    mg1: {
        port: 27019,
        ip: "10.21.3.44"
    }
};


/**
 * the static host
 */

exports.sta = {
    redis: {
        'token': {
            ip: '10.21.3.42',
            port: '6391',
            select: '1'
        },
        'cache':{
            ip: '10.21.3.42',
            port: '6390'
        }
    },
    //
    group: {
        'api': {
            ip: '10.21.3.93',
            port: '80'
        }
    },
    friend: {
        'api': {
            ip: '10.21.3.93',
            port: '80'
        }
    }
};


/**
 *redis、node server
 */
exports.Server = {
    PNode: {},
    PRedis: {
        'pr1': {
            'ip': '10.21.3.42',
            'port': '6391'
        }
    },
    GRedis: {
        'gr1': {
            'ip': '10.21.3.42',
            'port': '6391'
        }
    },
    GSub: {},
    URedis: {}
};

exports.users = {};
