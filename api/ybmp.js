exports.decode = function(order) {
    var ex = /^[A-Z]{3}\:{3}\{.+}$/;
    if (ex.test) {
        var ret = {};
        var orders = order.split(':::');
        var json = '';
        var server = null;
        if (orders[1].indexOf('::') != -1) {
            json = orders[1].split('::')[1];

        } else {
            json = orders[1];
        }
        ret.order = orders[0];
        ret.data = JSON.parse(json);
        ret.server = server || '';
        return ret;
    } else {
        return "Error"
    }
}

exports.encode = function(order, server, data) {
    if (arguments.length == 2) {
        var data = server;
        var dataStr = JSON.stringify(data);
        return order + ':::' + dataStr;        
    } else if (arguments.length == 3) {
        var dataStr = JSON.stringify(data);
        return order + ':::' + server + '::' + dataStr;
    }
}
