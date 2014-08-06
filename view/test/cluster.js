/**
 * @author Mofei
 */
var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;

var visitTime = 0;
if (cluster.isMaster) {
    console.log('[master] ' + "start master...");

    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('listening', function(worker, address) {
        console.log('[master] ' + 'listening: worker' + worker.id + ',pid:' + worker.process.pid + ', Address:' + address.address + ":" + address.port);
    });

} else if (cluster.isWorker) {
    //console.log('[worker] ' + "start worker ..." + cluster.worker.id);
    // http.createServer(function(req, res) {
        // res.end('123')
        // //res.end('worker' + cluster.worker.id + ',PID:' + process.pid + ' TIME:' + visitTime++);
    // }).listen(3000);
}


// http.createServer(function(req, res) {
    // res.end('123')
// }).listen(3000);
