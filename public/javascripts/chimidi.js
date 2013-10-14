define(['promenade', 'jquery', 'midi', 'monkey'],
       function(Promenade, $, MIDI, Monkey) {
  'use strict';

         var key2Note = {
           65: "C2",
           83: "D2",
           68: "E2",
           70: "F2",
           71: "G2",
           72: "A2",
           74: "B2",
           75: "C3",
           76: "D3",
           186: "E3",
           222: "F3",
           219: "G3",
           221: "A3",
           220: "B3",           
           81: "Db2",
           87: "Eb2",
           69: "Gb2",
           82: "Ab2",
           84: "Bb2",
           89: "Db3",
           85: "Eb3",
           73: "Gb3",
           79: "Ab3",
           80: "Bb3",
         };

  MIDI.loadPlugin({
    soundfontUrl: './soundfonts/',
    instrument: 'acoustic_grand_piano',
    callback: function() {
      $('.keyboard li').on('mousedown touchstart', function() {
        var key = $(this);
        var note = MIDI.keyToNote[key.data('note')];
        var volume = 127;
        
        //console.log("Note %d", note)
        chmidi.doNoteOn(note, volume);
        
        key.one('mouseup mouseout touchend', function off() {
          key.off('mouseup mouseout touchend', off);
          chmidi.doNoteOff(note);
        });
        return false;
      });

      $(document).keyup(function(e) {
        var note = MIDI.keyToNote[key2Note[e.which]];
        var volume = 127;

        if (note) {          
          chmidi.doNoteOff(note, volume);
        }
      });

      $(document).keydown(function(e) {
        var note = MIDI.keyToNote[key2Note[e.which]];
        var volume = 127;

        if (note) {
          chmidi.doNoteOn(note, volume);
        }
      });
    }
  });
});
