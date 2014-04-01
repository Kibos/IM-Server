exports.socket = {
    port : 5000
};

exports.redis = {
    servers : ['10.21.3.66:6379']
};

exports.api = {
    s1 : {
        ip : '10.21.3.59',
        port : '8888'
    }
};

exports.sta = {
    PPSH : {
        pp1 : {
            ip : '10.21.3.66',
            port : '6379'
        }
    }
}

exports.Server = {
    PNode : {},
    PRedis : {
        'pr1' : {
            'ip' : '10.21.3.66',
            'port' : '6379'
        }
    },
    GRedis : {
        'gr1' : {
            'ip' : '10.21.3.66',
            'port' : '6379'
        }
    },
    GSub : {},
    URedis : {}
};
