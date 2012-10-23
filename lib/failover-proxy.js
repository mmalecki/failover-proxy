var net = require('net');

module.exports = module.exports.createServer = function (options) {
  return new FailoverProxy(options);
};

var FailoverProxy = module.exports.FailoverProxy = function (options) {
  var self = this;

  self.hosts = options.hosts.slice(0);

  self.server = net.createServer(self._requestHandler.bind(self));
};

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

      doProxy(self.hosts[0]);
    }

    socket.on('data', onIncomingData);
    socket.on('end', onIncomingEnd);

    outgoing = net.connect(host, onOutgoingConnected);

    outgoing.on('data', onOutgoingData);
    outgoing.on('end', onOutgoingEnd);
    outgoing.on('error', onOutgoingError);
  }

  doProxy(self.hosts[0]);
};
