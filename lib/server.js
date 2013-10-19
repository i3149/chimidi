var WebSocket = require('ws');
var zmq = require('zmq');
var express = require('express');
var RedisStore = require('connect-redis')(express);

var SessionStore = new RedisStore();

var uid = (function() {
  var _id = 0;
  return function(other) {
    return (other ? other + ':' : '') + _id++;
  };
})();

function MonkeyServer() {
  this._requests = {};
  this._app = express();
  this._cookieParser = express.cookieParser('sdfskdjfhskjdf');

  this._app.use(this._cookieParser);
  this._app.use(express.session({store: SessionStore}));
}

MonkeyServer.prototype.start = function(wsPort, inboundSocket, outboundSocket) {
  if (this._ws) {
    return;
  }

  // Start the express session guy going.
  this._app.get('/register', this._onRegister.bind(this));
  this._app.listen(wsPort+1);

  console.log('Starting %d %s %s sessions on: %d', wsPort, outboundSocket, inboundSocket, wsPort+1);

  this._ws = new WebSocket.Server({ port: wsPort });
  this._zmqPush = zmq.socket('push');
  this._zmqPull = zmq.socket('pull');

  this._zmqPush.connect(outboundSocket);
  this._zmqPull.bindSync(inboundSocket);
  this._zmqPull.on('message', this._onZmqMessage.bind(this));

  this._ws.on('connection', this._onWsConnection.bind(this));
};

MonkeyServer.prototype.stop = function() {
  this._ws.close();
  this._ws = null;
};

MonkeyServer.prototype._onRegister = function(req, res) {
  var sessionId = req.sessionID
  if (this._requests[sessionId]) {
    this._requests[sessionId].close()
    console.log("halted session %s", sessionId)
  }
  
  req.session.destroy();
  res.jsonp({msg: "Ack", sid: req.sessionID});
}

MonkeyServer.prototype._onZmqMessage = function(message) {
  var data = JSON.parse(message);

  console.log('ZMQ << %s', message);

  var sessionId = data.data["S"];
  if (sessionId) {
    if (this._requests[sessionId]) {
      this._requests[sessionId](data);
    }
  } else {
    if (this._requests[data.requestId]) {
      this._requests[data.requestId](data);
    } else if (this._requests["0:0"]) {
      this._requests["0:0"](data);
    }
  }
};

MonkeyServer.prototype._respond = function(client, responseId, data) {
  var message;

  data.requestId = responseId;

  message = JSON.stringify(data);

  console.log('WS << %s', message);
  
  if (client.readyState == WebSocket.OPEN) {
    client.send(message);
  } else {
    console.log('WS << %s %d', "not sending message: WS state: ", client.readyState);
  }
};

MonkeyServer.prototype._onWsMessage = function(client, message) {
  var data = JSON.parse(message);
  var responseId = data.requestId;
  var sessionId = data.data["S"];

  data.requestId = uid(data.requestId);

  console.log('WS >> Sid: %s', sessionId);

  if (sessionId) {
    this._requests[sessionId] =
      this._respond.bind(this, client, responseId);
  } else {
    this._requests[data.requestId] =
      this._respond.bind(this, client, responseId);
  }

  console.log('WS >> %s', message);

  message = JSON.stringify(data);

  console.log('ZMQ >> %s', message);

  this._zmqPush.send(message);
};

MonkeyServer.prototype._onWsConnection = function(client) {

  // Hook into a session here.
  // @TODO -- is this needed?
  this._cookieParser(client.upgradeReq, null, function(err) {});

  client.send('Avast ye\' scurvy Monkey!');
  client.on('message', this._onWsMessage.bind(this, client));
};

var monkeyServer = new MonkeyServer();

if (process.argv.length >= 5) {
    monkeyServer.start(parseInt(process.argv[2]), process.argv[3], process.argv[4]);
} else {
    console.log("Usage: server.js port inbound outbound")
}
