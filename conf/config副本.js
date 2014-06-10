/**
 * mongodb
 */
exports.mongodb = {
    // the defaulte mongodb
    mg1: {
        port: 27017,
        ip: "10.21.3.59"
    }
};

/**
 * the static host
 */

exports.sta = {
    // the plugpush server
    // PPSH: {
    //     pp1: {
    //         ip: '10.21.3.66',
    //         port: '6379'
    //     }
    // },
    redis: {
        'token': {
            ip: '10.21.3.59',
            port: '6379',
            select: '1'
        }
    },
    //
    group: {
        'api': {
            ip: '10.21.3.59',
            port: '8888'
        }
    },
    friend: {
        'api': {
            ip: '10.21.3.59',
            port: '8888'
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
            'ip': '10.21.3.66',
            'port': '6379'
        }
    },
    GRedis: {
        'gr1': {
            'ip': '10.21.3.66',
            'port': '6379'
        }
    },
    GSub: {},
    URedis: {}
};

exports.users = {};