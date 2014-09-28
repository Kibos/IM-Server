
function retJSON(req, res, json) {
    if (!res) {
        return false;
    }
    res.writeHead(200, {
        'charset': 'UTF-8',
        'Content-Type': 'application/json'
    });
    var endJson = {
        sta: 200,
        msg: json || '发送成功'
    };
    res.end(JSON.stringify(endJson));
}

function ret403(req, res, msg) {
    if (!res) {
        return false;
    }
    res.writeHead(403, {
        'Content-Type': 'application/json'
    });
    var endJson = {
        sta: 403,
        msg: msg || '发送失败'
    };
    res.end(JSON.stringify(endJson));
}

exports.retJSON = retJSON;
exports.ret403 = ret403;