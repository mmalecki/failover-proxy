# failover-proxy [![Build Status](https://secure.travis-ci.org/mmalecki/failover-proxy.png)](http://travis-ci.org/mmalecki/failover-proxy)
TCP proxy with a dynamic fallback, designed for high availability systems.

When proxy receives an error from the receiving side (e.g. your backend
servers), it redirects the traffic to the next server from the pool,
assuring that data gets buffered in between requests.

## Installation

    npm install failover-proxy

## Usage

### API
```js
var proxy = require('failover-proxy')({
  hosts: [
    {
      host: '127.0.0.1',
      port: 9001
    },
    {
      host: '127.0.0.1',
      port: 9002
    }
  ]
});

proxy.listen(9000);

proxy.on('cycle', function (badHost, newHost) {
  //
  // `cycle` event happens when proxy couldn't contact the backend host and
  // switched to the next server. You can put your own reporting logic in here.
  //
});
```

### Binary
```sh
$ cat options.json
{
  "hosts": [
    {
      "host": "127.0.0.1",
      "port": 9001
    },
    {
      "host": "127.0.0.1",
      "port": 9002
    }
  ],
  "port": 9000
}
$ failover-proxy options.json
failover-proxy listening on 9000
```
