(function(global) {
  'use strict';
  
  requirejs.config({
    baseUrl: 'javascripts',
    paths: {
      'jquery': 'support/jquery',
      'underscore': 'support/underscore',
      'templates': 'support/templates',
      'promenade': 'support/promenade',
      'backbone': 'support/backbone',
      'handlebars': 'support/handlebars',
      'midi': 'support/midi',
      'Base64': 'support/Base64',
      'base64binary': 'support/base64binary'
    },
    shim: {
      'underscore': {
        exports: '_'
      },
      'backbone': {
        deps: ['underscore', 'jquery'],
        exports: 'Backbone'
      },
      'handlebars': {
        exports: 'Handlebars'
      },
      'templates': {
        deps: ['handlebars']
      },
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

  require(['application'], function(Chmidi) {
    global.chmidi = new Chmidi();
  });
})(this);
