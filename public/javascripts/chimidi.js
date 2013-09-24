define(['jquery', 'midi'],
       function($, MIDI) {
  'use strict';

  MIDI.loadPlugin({
    soundfontUrl: './soundfonts/',
    instrument: 'acoustic_grand_piano',
    callback: function() {
      $('.keyboard li').on('mousedown touchstart', function() {
        var key = $(this);
        var note = MIDI.keyToNote[key.data('note')];

        key.addClass('pressed');

        MIDI.setVolume(0, 127);
        MIDI.noteOn(0, note, 127, 0);

        key.one('mouseup mouseout touchend', function off() {
          key.off('mouseup mouseout touchend', off);
          MIDI.noteOff(0, note, 0);
          key.removeClass('pressed');
        });

        return false;
      });
    }
  });
});
