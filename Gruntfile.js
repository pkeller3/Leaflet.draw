'use strict';


module.exports = function (grunt) {
	grunt.initConfig({
		// Project settings
		leafletDraw: {
			// configurable paths
			src: './src',
			dist: './dist'
		},

		//Check js for errors
		jshint: {
			options: {
				jshintrc: '.jshintrc',
				reporter: require('jshint-stylish')
			},
			all: [
				'Gruntfile.js',
				'<%= leafletDraw.src %>/**/*.js'
			]
		},

		// Empties folders to start fresh
		clean: {
			options: {
				force: true
			},
			dist: {
				files: [{
					dot: true,
					src: [
						'.tmp',
						'<%= leafletDraw.dist %>/*',
						'!<%= leafletDraw.dist %>/.git*'
					]
				}]
			}
		},

		// Join the files together
		concat: {
			options: {},
			dist: {
				src: [
					'<%= leafletDraw.src %>/ext/LatLngUtils.js',
					'<%= leafletDraw.src %>/dom/Draw.Touch.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.Feature.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.Marker.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.MarkerTouch.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.Polyline.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.PolylineTouch.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.Polygon.js',
					'<%= leafletDraw.src %>/draw/handler/Draw.PolygonTouch.js',
					'<%= leafletDraw.src %>/edit/handler/EditToolbar.Edit.js',
					'<%= leafletDraw.src %>/edit/handler/Edit.Poly.js'
				],
				dest: '<%= leafletDraw.dist %>/leaflet.draw-src.js',
			},
		},

		uglify: {
			dist: {
				files: {
					'<%= leafletDraw.dist %>/leaflet.draw.min.js': ['<%= leafletDraw.dist %>/leaflet.draw-src.js']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.registerTask('default', ['jshint:all', 'clean:dist', 'concat:dist', 'uglify:dist']);

};