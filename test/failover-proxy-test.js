var net = require('net'),
    assert = require('assert'),
    cb = require('assert-called'),
    failoverProxy = require('../lib/failover-proxy');

var badHost = {
  host: '127.0.0.1',
  port: 8220
};

var goodHost = {
  host: '127.0.0.1',
  port: 8221
};

var proxy = failoverProxy({
  hosts: [ badHost, goodHost ]
});

proxy.listen(8222);

proxy.on('cycle', cb(function (bad, next) {
  console.log('cycle:', bad.port, '->', next.port);
  assert.equal(bad.port, badHost.port);
  assert.equal(next.port, goodHost.port);
}));

var server = net.createServer(function (incoming) {
  console.log('got connection');

  incoming.once('data', function (chunk) {
    // XXX: ugly
    assert.equal(chunk.toString('utf8'), 'Hello from client\n');
    console.log('data from client: ' + chunk);

    incoming.write('Hello from server\n', function () {
      incoming.on('end', cb(function () {
        console.log('end from client');

        server.close();
        proxy.close();
      }));
    });
  });

  incoming.on('error', function (err) {
    throw err;
  });
});
server.listen(goodHost.port);

var outgoing = net.connect(8222, function () {
  console.log('connected');

  outgoing.write('Hello from client\n', function () {
    outgoing.once('data', function (chunk) {
      // XXX: ugly
      assert.equal(chunk.toString('utf8'), 'Hello from server\n');
      console.log('data from server: ' + chunk);

      outgoing.end();
    });
  });
});

outgoing.on('error', function (err) {
  throw err;
});
