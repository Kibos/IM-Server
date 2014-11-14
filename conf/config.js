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
            port: '6379',
            select: '3'
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
    '10.21.3.66': 'development'
};

exports.replicas = 80;

exports.legalIP = {
    developIp : '10.21.'
};

exports.users = {};

exports.NodeInfo = {
    Brain : {
        ip: '10.21.3.63',
        port: 4999
    }
};
