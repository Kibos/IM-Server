exports.mongodb = {
    mg1: {
        port: 27019,
        ip: '10.21.3.44',
        dbname: 'larvel'
    },
    mg2: {
        port: 27019,
        ip: '10.21.3.44',
        dbname: 'larvel'
    },
    mg3: {
        port: 27019,
        ip: '10.21.3.44',
        dbname: 'larvel'
    }
};

exports.sta = {
    redis: {
        'token': {
            ip: '10.21.3.42',
            port: '6391',
            select: '1'
        },
        'cache': {
            ip: '10.21.3.42',
            port: '6390',
            select: '3'
        }
    },
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

exports.Server = {
    PNode: {},
    PRedis: {
        'pr1': {
            'ip': '10.21.3.42', //gmsg.1.redis
            'port': '6391'
        }
    },
    NRedis: {
        'pr1': {
            'ip': '10.21.3.139', //pushStack redis
            'port': '6581'
        }
    },
    GRedis: {
        'gr1': {
            'ip': '10.21.3.42', //gmsg.2.redis
            'port': '6391'
        }
    },
    GSub: {},
    URedis: {}
};

exports.redisPwd = {};

exports.replicas = 80;

exports.legalIP = {
    developIp : '10.21.'
};

exports.users = {};

exports.NodeInfo = {
    Brain : {
        ip: '10.21.3.92',
        port: 4999
    }
};
