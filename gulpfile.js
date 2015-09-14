var fs = require('fs');
var path = require('path');
var swig = require('gulp-swig');
var rename = require('gulp-rename');
var gulp = require('gulp');
var frontMatter = require('gulp-front-matter');

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

var sourcePath = 'src';

var data = [];
var folders = getFolders(sourcePath);

for (var i=0; i<folders.length; i++) {
	var folder = folders[i];
	data.push({
		folder: folder,
		title: folder.charAt(0).toUpperCase() + folder.slice(1),
		icons: getIcons(sourcePath + '/' + folder)
	});
}

var opts = {
	data: {
		folders: data
	}
};

gulp.task('compile-readme', function() {
	gulp.src('README.tmpl')
		.pipe(frontMatter({ property: 'data' }))
		.pipe(swig(opts))
		.pipe(rename('README.md'))
		.pipe(gulp.dest('.'));
});

gulp.task('default', ['compile-readme']);