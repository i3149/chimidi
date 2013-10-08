define(['promenade', 'jquery', 'midi', 'monkey'],
       function(Promenade, $, MIDI, Monkey) {
  'use strict';

  MIDI.loadPlugin({
    soundfontUrl: './soundfonts/',
    instrument: 'acoustic_grand_piano',
    callback: function() {
      $('.keyboard li').on('mousedown touchstart', function() {
        var key = $(this);
        var note = MIDI.keyToNote[key.data('note')];
        var volume = 127;
        
        //console.log("Note %d", note)
        chmidi.doNoteOn(note, volume)

        key.one('mouseup mouseout touchend', function off() {
          key.off('mouseup mouseout touchend', off);
          chmidi.doNoteOff(note)
        });

        return false;
      });
    }
  });
});
