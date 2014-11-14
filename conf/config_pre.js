exports.mongodb = {
    mg1: {
        port: 27017,
        ip: '10.21.4.87',
        dbname: 'larvel'
    },
    mg2: {
        port: 27017,
        ip: '10.21.4.87',
        dbname: 'larvel'
    },
    mg3: {
        port: 27017,
        ip: '10.21.4.87',
        dbname: 'larvel'
    }
};

/**
 * the static host
 */
exports.sta = {
    redis: {
        'token': {
            ip: '10.21.4.85',
            port: '6379',
            select: '1'
        },
        'cache': {
            ip: '10.21.4.85',
            port: '6379',
            select: '3'
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
            'ip': '10.21.4.86', //gmsg.1.redis
            'port': '6380'
        }
    },
    GRedis: {
        'gr1': {
            'ip': '10.21.4.85', //gmsg.2.redis
            'port': '6380'
        }
    },
    GSub: {},
    URedis: {}
};

exports.redisPwd = {
    '10.21.4.85': 'premobile_master$%*85',
    '10.21.4.86': 'premobile_master$%*85'
};

exports.replicas = 80;

exports.legalIP = {
    prepareIp : '10.21.4.'
};

exports.users = {};

exports.NodeInfo = {
    Brain : {
        ip: '10.21.4.83',
        port: 4999
    }
};
