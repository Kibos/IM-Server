/**
 * brain
 */
exports.brain = {
    brain1: {
        ip: '10.21.3.62',
        port: 4999
    }
};

/**
 * mongodb
 */
exports.mongodb = {
    // the defaulte mongodb
    mg1: {
        port: 27017,
        ip: '10.21.3.59',
        dbname: 'larvel'
    }
};

/**
 * the static host
 */
exports.sta = {
    redis: {
        'token': {
            ip: '10.21.3.59',
            port: '6379',
            select: '1'
        },
        'cache': {
            ip: '10.21.3.59',
            port: '6379'
        }
    },
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
            'ip': '10.21.3.66', //gmsg.1.redis
            'port': '6379'
        }
    },
    GRedis: {
        'gr1': {
            'ip': '10.21.3.66', //gmsg.2.redis
            'port': '6379'
        }
    },
    GSub: {},
    URedis: {}
};

exports.users = {};
