var net = require('net'),
    util = require('util');

module.exports = module.exports.createServer = function (options) {
  return new FailoverProxy(options);
};

var FailoverProxy = module.exports.FailoverProxy = function (options) {
  var self = this;

  self.hosts = options.hosts.slice(0);

  net.Server.call(this, self._requestHandler.bind(self));
};
util.inherits(FailoverProxy, net.Server);

FailoverProxy.prototype._requestHandler = function (socket) {
  var self = this,
      buffer = '';

  function doProxy(host) {
    var connected = false,
        connectQueue = [],
        outgoing;

    function deferToConnect(f, c, args) {
      connectQueue.push([f, c, args]);
    }

    function onIncomingData(chunk) {
      if (!connected) {
        deferToConnect(outgoing.write, outgoing, [chunk]);
      }
      else {
        outgoing.write(chunk);
      }
    }

    function onIncomingEnd() {
      if (connected) {
        outgoing.end();
      }
      else {
        deferToConnect(outgoing.end, outgoing, []);
      }
    }

    function onIncomingDrain() {
      if (outgoing.readable && outgoing.resume) {
        outgoing.resume();
      }
    }

    function onOutgoingConnected() {
      connectQueue.forEach(function (action) {
        action[0].apply(action[1], action[2]);
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

    function onOutgoingDrain() {
      if (socket.readable && socket.resume) {
        socket.resume();
      }
    }

    socket.on('data', onIncomingData);
    socket.on('end', onIncomingEnd);
    socket.on('drain', onIncomingDrain);

    outgoing = net.connect(host, onOutgoingConnected);

    outgoing.on('data', onOutgoingData);
    outgoing.on('end', onOutgoingEnd);
    outgoing.on('error', onOutgoingError);
    outgoing.on('drain', onOutgoingDrain);
  }

  doProxy(self.hosts[0]);
};
