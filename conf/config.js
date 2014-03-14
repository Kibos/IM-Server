exports.socket = {
    port : 5000
};

exports.redis = {
    servers : ['10.21.3.66:6379']
};

exports.Server = {
    PNode : {},
    PRedis : {
        'pr1' : {
            'ip' : '10.21.3.66',
            'port' : '6379'
        }
    },
    GSub : {},
    GRedis : {},
    URedis : {}
};
 