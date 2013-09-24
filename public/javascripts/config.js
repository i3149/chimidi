requirejs.config({
  baseUrl: 'javascripts',
  paths: {
    'jquery': 'support/jquery',
    'midi': 'support/midi',
    'Base64': 'support/Base64',
    'base64binary': 'support/base64binary'
  },
  shim: {
    'midi/MIDI/LoadPlugin': {
      deps: ['midi/MIDI/AudioDetect']
    },
    'midi/MIDI/Plugin': {
      deps: ['midi/MIDI/LoadPlugin']
    },
    'midi/MIDI/Player': {
      deps: ['midi/MIDI/Plugin']
    }
  },
  deps: ['chimidi']
});
