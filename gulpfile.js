//
// Require
//
var fs = require('fs'),
    path = require('path'),
    gulp = require('gulp'),
    swig = require('gulp-swig'),
    svgmin = require('gulp-svgmin'),
    rename = require('gulp-rename'),
    frontMatter = require('gulp-front-matter');


//
// Options
//
var options = {
    readme: {
        template: './tmpl/README.tmpl',
        filename: 'README.md',
        destination: '.'
    },
    src: './src/',
    dist: './dist/'
};


//
// Custom Functions
//
function getFolders(dir) {
	return fs.readdirSync(dir)
		.filter(function(file) {
			return fs.statSync(path.join(dir, file)).isDirectory();
		});
}
function getIcons(dir) {
	return fs.readdirSync(dir)
		.filter(function(file) {
			return fs.statSync(path.join(dir, file)).isFile();
		});
}


//
// Minify SVGs
//
gulp.task('svgmin', function(cb) {
    gulp.src([
            options.src + '**/*.svg'
        ])
        .pipe(svgmin())
        .pipe(gulp.dest(options.dist));
    cb();
});


//
// Compile Readme
//
gulp.task('compile-readme', function(cb) {
	var data = [];
	var folders = getFolders(options.dist);
	for (var i=0; i<folders.length; i++) {
		var folder = folders[i];
		data.push({
			folder: folder,
			title: folder.charAt(0).toUpperCase() + folder.slice(1),
			icons: getIcons(options.dist + folder)
		});
	}
	var opts = {
		data: {
			folders: data
		}
	};
    gulp.src(options.readme.template)
		.pipe(frontMatter({ property: 'data' }))
		.pipe(swig(opts))
		.pipe(rename(options.readme.filename))
		.pipe(gulp.dest(options.readme.destination));
    cb();
});


//
// Default Task
//
gulp.task('default', [
    'svgmin',
    'compile-readme'
]);