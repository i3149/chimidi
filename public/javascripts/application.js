define(['promenade', 'jquery', 'monkey'], function(Promenade, $, Monkey) {
  var Chmidi = Promenade.Application.extend({
    initialize: function() {
      this.getNewSession();
      this.monkey = new Monkey();
      this.monkey.connect();
      this.monkey.setAI(_.bind(this._handleAICall, this))
    },

    getNewSession: function() {
      $.ajax({
        type: 'GET',
        url: "http://" + document.location.hostname + ":9002/register",
        async: false,
        contentType: "application/json",
        dataType: 'jsonp',
        success: function(json) {
          Chmidi._session_id = json.sid;
          console.log("Starting session %s", Chmidi._session_id);
        },
        error: function(e) {
          console.log(e.message);
        }
      });
    },
    
    doNoteOn: function(note, volume) {

      var data = {
        "S": Chmidi._session_id,
        "Note": note.toString(),
        "Vol": volume.toString(),
        "Action": "on",
      };
      var keyId = MIDI.noteToKey[note];

      MIDI.setVolume(0, volume);
      MIDI.noteOn(0, note, 127, 0);
      $("#"+keyId).addClass('pressed');

      console.log('CHMIDI >> %s', JSON.stringify(data));

      this.monkey.send(data).then(function(resp) {
        console.log('CHMIDI << %s', JSON.stringify(resp));
      }
    )},

    doNoteOff: function(note) {
      var data = {
        "S": Chmidi._session_id,
        "Note": note.toString(),
        "Action": "off"
      };
      var keyId = MIDI.noteToKey[note];
 
      MIDI.noteOff(0, note, 0);
      $("#"+keyId).removeClass('pressed');

      console.log('CHMIDI >> %s %s', JSON.stringify(data), this._session_id);

      this.monkey.send(data).then(function(resp) {
        console.log('CHMIDI << %s', JSON.stringify(resp));
      });
    },

    _handleAICall: function(event) {
      
      var note = parseInt(event.data["Note"])
      var volume = parseInt(event.data["Vol"])
      var action = event.data["Action"]
      var keyId = MIDI.noteToKey[note];

      console.log("Processing ai event: %d %d %s", note, volume, action);
      if (action == "on") {
        MIDI.setVolume(0, volume);
        MIDI.noteOn(0, note, 127, 0);
        $("#"+keyId).addClass('pressed');
      } else {
        MIDI.noteOff(0, note, 0);
        $("#"+keyId).removeClass('pressed');
      }
    }
  });

  return Chmidi;
});
