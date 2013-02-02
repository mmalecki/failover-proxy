var assert = require('assert'),
    failoverProxy = require('../'),
    proxy = failoverProxy();

var hosts = [
  { host: '127.0.0.1', port: 80 },
  { host: 'localhost', port: 81 }
];

assert.equal(proxy.hosts.length, 0);

proxy.addHost(hosts[0]);
assert.equal(proxy.hosts.length, 1);
assert.deepEqual(proxy.hosts[0], hosts[0]);

proxy.addHost(hosts[1]);
assert.equal(proxy.hosts.length, 2);
assert.deepEqual(proxy.hosts[1], hosts[1]);

proxy.removeHost(hosts[0]);
assert.equal(proxy.hosts.length, 1);
assert.deepEqual(proxy.hosts[0], hosts[1]);

proxy.removeHost(hosts[1]);
assert.equal(proxy.hosts.length, 0);
