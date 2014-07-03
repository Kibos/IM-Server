/**
 * mongodb
 */


exports.mongodb = {
    // the defaulte mongodb
    mg1: {
        port: 27017,
        ip: "store.1.mongo"
    }
};

/**
 * the static host
 */
exports.sta = {
    redis: {
        'token': {
            ip: 'session.1.redis',
            port: '6379',
            select: '1'
        },
        'cache': {
            ip: 'session.1.redis',
            port: '6379'
        }
    },
    group: {
        'api': {
            ip: 'api.1.php',
            port: '80'
        }
    },
    friend: {
        'api': {
            ip: 'api.1.php',
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
            'ip': 'msg.1.redis',
            'port': '6379'
        },
        'pr2': {
            'ip': 'msg.2.redis',
            'port': '6379'
        }
    },
    GRedis: {
        'gr1': {
            'ip': 'gmsg.1.redis',
            'port': '6379'
        },
        'gr2': {
            'ip': 'gmsg.2.redis',
            'port': '6379'
        }
    },
    GSub: {},
    URedis: {}
};