module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    watch: {
        scripts: {
            files: ['test/**/*.js', 'src/**/*.js'],
            tasks: ['concat', 'uglify', 'copy', 'jasmine']
        }
    },

    jasmine: {
        src: 'dist/erg.js',
        options: {
            specs: 'test/**/*-spec.js'
        }
    },

    concat: {
        options: {
            separator: '\n'
        },
        dist: {
            src: [
              'src/erg.js'
            ],
            dest: 'dist/erg.js'
        }
    },

    uglify: {
        options: {
        },
        my_target: {
            files: {
                'dist/erg.min.js': [
                  'src/erg.js'
                ]
            }
        }
    }
  });


  // Load Plugins
  //

  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');


  // Tasks
  //

  grunt.registerTask('default', ['jasmine']);

};