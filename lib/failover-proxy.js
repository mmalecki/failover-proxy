var net = require('net'),
    util = require('util');

module.exports = module.exports.createServer = function (options) {
  return new FailoverProxy(options);
};

var FailoverProxy = module.exports.FailoverProxy = function (options) {
  var self = this;

  self.hosts = (options && options.hosts) ? options.hosts.slice(0) : [];

  net.Server.call(this, self._requestHandler.bind(self));
};
util.inherits(FailoverProxy, net.Server);

FailoverProxy.prototype._requestHandler = function (socket) {
  var self = this,
      outgoing,
      connectQueue = [],
      connected = false;

  function deferToConnect(method, args) {
    if (connected) {
      outgoing[method].apply(outgoing, args);
    }
    else {
      connectQueue.push([method, args]);
    }
  }

  function onIncomingData(chunk) {
    deferToConnect('write', [chunk]);
  }

  function onIncomingEnd() {
    deferToConnect('end', []);
  }

  function onOutgoingConnected() {
    connectQueue.forEach(function (action) {
      outgoing[action[0]].apply(outgoing, action[1]);
    });
    connectQueue.length = 0;

    connected = true;
  }

  function onOutgoingData(chunk) {
    if (socket.write(chunk) === false) {
      outgoing.pause();
    }
  }

  function onOutgoingEnd() {
    socket.end();
  }

  function onOutgoingError(err) {
    var badHost = self.hosts.shift();
    self.hosts.push(badHost);

    self.emit('cycle', badHost, self.hosts[0]);

    doProxy(self.hosts[0]);
  }

  function doProxy(host) {
    outgoing = net.connect(host, onOutgoingConnected);

    outgoing.on('data', onOutgoingData);
    outgoing.on('end', onOutgoingEnd);
    outgoing.on('error', onOutgoingError);
  }

  socket.on('data', onIncomingData);
  socket.on('end', onIncomingEnd);

  doProxy(self.hosts[0]);
};

FailoverProxy.prototype.addHost = function (host) {
  this.hosts.push(host);
};

FailoverProxy.prototype.removeHost = function (host) {
  var removed = false,
      i;

  function hostEqual(a, b) {
    return a.host === b.host && a.port === b.port;
  }

  for (i = this.hosts.length - 1; i >= 0; i--) {
    // Remark: maybe we should do a DNS resolution here?
    if (hostEqual(this.hosts[i], host)) {
      this.hosts.splice(i, 1);
      removed = true;
    }
  }

  return removed;
};
