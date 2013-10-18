define(['promenade', 'underscore', 'jquery'], function(Promenade, _, $) {

  var uid = (function() {
    var _id = 0;
    return function(other) {
      return (other ? other + ':' : '') + _id++;
    };
  })();

  var Monkey = Promenade.Object.extend({
    initialize: function() {
      this._requests = {};
    },
    connect: function() {
      if (this._ws) {
        return;
      }

      this._ws = new WebSocket('ws://'+document.location.hostname+':9001');
      this._ws.addEventListener('message', _.bind(this._onMessage, this));
    },
    disconnect: function() {
      this._ws.onclose = null;
      this._ws.close();
      this._ws = null;
    },
    setAI: function(aifn) {
      this._aiHandler = aifn;
    },
    send: function(data) {
      var out;
      var eventuallyResponds;
      var requestId;
      var event;

      if (!this._ws) {
        return;
      }

      event = {
        data: data
      };

      try {
        requestId = uid();
        event.requestId = requestId;

        out = JSON.stringify(event);

        eventuallyResponds = new $.Deferred();
        this._requests[requestId] = eventuallyResponds;

        //console.log('MONKEY >> %s', out);
        this._ws.send(out);

        return eventuallyResponds.promise();
      } catch(e) {}
    },
    _onMessage: function(message) {
      var response = message.data;
      var event;

      //console.log('MONKEY << %s', response);

      try {
        event = JSON.parse(response);
      } catch(e) {}

      // Should the ai logic be abstracted out somewhere? 
      if (event && event.data.ai && this._aiHandler) {
        this._aiHandler(event);
      } else {
        if (event && event.requestId) {
          this._requests[event.requestId].resolve(event.data);
        }
      }
    }
  });

  return Monkey;
});
