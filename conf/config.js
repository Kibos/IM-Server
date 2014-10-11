exports.mongodb = {
    mg1: {
        port: 27017,
        ip: '10.21.3.64',
        dbname: 'larvel'
    },
    mg2: {
        port: 27018,
        ip: '10.21.3.64',
        dbname: 'larvel'
    },
    mg3: {
        port: 27019,
        ip: '10.21.3.64',
        dbname: 'larvel'
    }
};

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

exports.Server = {
    PNode: {},
    PRedis: {
        'pr1': {
            'ip': '10.21.3.66', //gmsg.1.redis
            'port': '6379'
        },
        'pr2': {
            'ip': '10.21.3.66', //gmsg.1.redis
            'port': '6380'
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
    governmentIP : '10.21.67.',
    developIp : '10.21.'
};

exports.users = {};

//var appIp = require('os').networkInterfaces().eth0[0].address;
var appIp = '10.21.3.63';

exports.NodeInfo = {
    Brain : {
        ip: appIp,
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
        port: 4202
    },
    PNode1 : {
        ip: appIp,
        port: 4001,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4001
    },
    PNode : {
        ip: appIp,
        port: 4251,
        type: 'PNode',
        id: 'pn_' + appIp + '_' + 4251
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
