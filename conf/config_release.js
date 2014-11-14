exports.mongodb = {
    mg1: {
        port: 27017,
        ip: "store.1.mongo",
        dbname: 'app'
    },
    mg2: {
        port: 27017,
        ip: "store.1.mongo",
        dbname: 'app'
    },
    mg3: {
        port: 27017,
        ip: "store.1.mongo",
        dbname: 'app'
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

exports.redisPwd = {
    '10.21.67.115': 'mobile_master$%*115',
    'msg.1.redis': 'mobile_master$%*115',
    '10.21.67.116': 'mobile_master$%*116',
    'msg.2.redis': 'mobile_master$%*116',
    '10.21.67.117': 'mobile_master$%*117',
    'gmsg.1.redis': 'mobile_master$%*117',
    '10.21.67.118': 'mobile_master$%*118',
    'gmsg.2.redis': 'mobile_master$%*118',
    '10.21.67.119': 'mobile_master$%*119',
    'session.1.redis': 'mobile_master$%*119',
    '10.21.67.120': 'mobile_master$%*120',
    'session.2.redis': 'mobile_master$%*120'
};

exports.replicas = 80;

exports.legalIP = {
    governmentIP : '10.21.67.'
};

exports.users = {};

exports.NodeInfo = {
    Brain : {
        ip: '10.21.67.200',
        port: 4999
    }
};
