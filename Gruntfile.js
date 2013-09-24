module.exports = function(grunt) {
  'use strict';
  var banner = '/*! <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("mm-dd-yyyy") %> */\n';

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-mocha-phantom-hack');

  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),
    watch: {
      javascripts: {
        files: [
          'public/javascripts/**/*.js',
          '!public/javascripts/support/*.js',
          '!public/javascripts/<%= pkg.name %>-release.js'
        ],
        tasks: ['requirejs']
      },
      stylesheets: {
        files: [
          'public/stylesheets/**/*.css',
          '!public/stylesheets/<%= pkg.name %>-release.css'
        ],
        tasks: ['cssmin']
      },
      test: {
        files: [
          'public/javascripts/**/*.js',
          'test/<%= pkg.name %>/**/*.js'
        ],
        tasks: ['test']
      }
    },
    requirejs: {
      release: {
        options: {
          name: '<%= pkg.name %>',
          baseUrl: 'public/javascripts/',
          mainConfigFile: 'public/javascripts/config.js',
          out: 'public/javascripts/<%= pkg.name %>-release.js',
          useStrict: true,
          include: ['support/almond'],
          addRequire: ['chimidi'],
          wrap: {
            start: banner
          }
        }
      }
    },
    cssmin: {
      combine: {
        files: [{
          dest: 'public/stylesheets/<%= pkg.name %>-release.css',
          src: [
            'public/stylesheets/support/normalize.css',
            'public/stylesheets/support/highlight.css',
            'public/stylesheets/**/*.css',
            '!public/stylesheets/<%= pkg.name %>-release.css'
          ]
        }]
      }
    },
    jshint: {
      all: [
        'public/javascripts/**/*.js',
        '!public/javascripts/support/**/*.js',
        '!public/javascripts/<%= pkg.name %>-release.js',
        'test/<%= pkg.name %>/**/*.js'
      ]
    },
    mocha: {
      all: ['test/index.html']
    }
  });

  grunt.registerTask('test', ['mocha', 'jshint']);
  grunt.registerTask('build', ['requirejs', 'cssmin']);
};
