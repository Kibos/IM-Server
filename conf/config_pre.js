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
    governmentIP : '10.21.'
};

exports.users = {};

var appIp = require('os').networkInterfaces().eth0[0].address;

exports.NodeInfo = {
    Brain : {
        ip: '10.21.4.83',
        port: 4999
    },
    BNode : {
        ip: appIp,
        port: 4999
    },
    BNode2 : {
        ip: appIp,
        port: 4998
    },
    MNode : {
        ip: appIp,
        port: 4202,
        type: 'MNode',
        id: 'mn_' + appIp + '_' + 4202
    },
    PNode : {
        ip: appIp,
        port: 4251,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4251
    },
    PNode1 : {
        ip: appIp,
        port: 4001,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4001
    },
    PNode2 : {
        ip: appIp,
        port: 4252,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4252
    },
    PNode3 : {
        ip: appIp,
        port: 4261,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4261
    },
    PNode4 : {
        ip: appIp,
        port: 4262,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4262
    },
    PNode5 : {
        ip: appIp,
        port: 4271,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4271
    },
    PNode6 : {
        ip: appIp,
        port: 4272,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4272
    },
    DNode : {
        ip: appIp,
        port: 4008,
        type: 'DNode',
        id: 'dn_' + appIp + '_' + 4008
    },
    DNode2 : {
        ip: appIp,
        port: 4201,
        type: 'DNode',
        id: 'dn_' + appIp + '_' + 4201
    },
    DNode3 : {
        ip: appIp,
        port: 4202,
        type: 'DNode',
        id: 'dn_' + appIp + '_' + 4202
    },
    GNode : {
        ip: appIp,
        port: 4101,
        type: 'GNode',
        id: 'gn_' + appIp + '_' + 4101
    },
    GNode2 : {
        ip: appIp,
        port: 4102,
        type: 'GNode',
        id: 'gn_' + appIp + '_' + 4102
    }
};
