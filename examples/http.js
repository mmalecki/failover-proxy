var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    failoverProxy = require('../lib/failover-proxy');

var filePath = path.join(__dirname, '..', 'test', 'fixtures', 'fillerama.txt');

var badHost = {
  host: '127.0.0.1',
  port: 8001
};

var goodHost = {
  host: '127.0.0.1',
  port: 8002
};

var proxy = failoverProxy({
  hosts: [ badHost, goodHost ]
});

proxy.listen(8000);

proxy.on('cycle', function (bad, next) {
  console.log('cycle:', bad.port, '->', next.port);
});

var server = http.createServer(function (req, res) {
  req.on('end', function () {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  });
});
server.listen(goodHost.port);
