var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    assert = require('assert'),
    cb = require('assert-called'),
    failoverProxy = require('../lib/failover-proxy');

var filePath = path.join(__dirname, 'fixtures', 'fillerama.txt');

var badHost = {
  host: '127.0.0.1',
  port: 8230
};

var goodHost = {
  host: '127.0.0.1',
  port: 8231
};

var proxy = failoverProxy({
  hosts: [ badHost, goodHost ]
});

proxy.listen(8232);

proxy.on('cycle', cb(function (bad, next) {
  console.log('cycle:', bad.port, '->', next.port);
  assert.equal(bad.port, badHost.port);
  assert.equal(next.port, goodHost.port);
}));

var server = http.createServer(cb(function (req, res) {
  var data = '';

  req.on('data', function (chunk) {
    data += chunk;
  });

  req.on('end', cb(function () {
    assert.equal(data, fs.readFileSync(filePath, 'utf8'));

    res.writeHead(200);
    res.end();

    server.close();
    proxy.close();
  }));
}));
server.listen(goodHost.port);

var outgoing = http.request({
  port: 8232,
  headers: {
    'content-length': fs.statSync(filePath).size
  }
});
fs.createReadStream(filePath).pipe(outgoing);

outgoing.on('error', function (err) {
  throw err;
});
