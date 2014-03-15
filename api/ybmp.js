exports.decode = function(order) {
    var ex = /^[A-Z]{3}\:{3}\{.+}$/;
    if (ex.test) {
        var ret = {};
        var orders = order.split(':::');
        ret.order = orders[0];
        ret.data = JSON.parse(orders[1])
        return ret;
    } else {
        return "Error"
    }
}

exports.encode = function(order, server, data) {
    if (arguments.length == 2) {
        var data = server;
        var dataStr = JSON.stringify(data);
        return order + ':::' + server + '::' + dataStr;
    } else if (arguments.length == 3) {
        var dataStr = JSON.stringify(data);
        return order + ':::' + dataStr;
    }
}
