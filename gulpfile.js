//
// Require
//
var fs = require('fs'),
    pkg = require('./package.json'),
    path = require('path'),
    gulp = require('gulp'),
    clean = require('gulp-clean'),
    twig = require('gulp-twig'),
    svgmin = require('gulp-svgmin'),
    rename = require('gulp-rename'),
    sequence = require('gulp-sequence');


//
// Options
//
var options = {
    readme: {
        template: './tmpl/markdown/README.twig',
        filename: 'README.md',
        destination: '.'
    },
    index: {
        template: './tmpl/html/index.twig',
        filename: 'index.html',
        destination: './dist'
    },
    src: './src/',
    dist: './dist/',
    material: './material/'
};


//
// Custom Functions
//
function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function (file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}
function getIcons(dir) {
    return fs.readdirSync(dir)
        .filter(function (file) {
            var fileExtension = path.extname(path.join(dir, file));
            if (fileExtension === ".svg") {
                return true;
            } else {
                return false;
            }
        });
}
function getFileContents(file) {
    return fs.readFileSync(file, 'utf8');
}


//
// Clean SVGs
//
gulp.task('clean', function (cb) {
    gulp.src([options.dist + '**/*.svg'])
        .pipe(clean());
    cb();
});


//
// Minify SVGs
//
gulp.task('min', function (cb) {
    gulp.src([options.src + '**/*.svg'])
        .pipe(svgmin({
            plugins: [
                { removeDimensions: true }
            ]
        }))
        .pipe(gulp.dest(options.dist));
    cb();
});


//
// Compile Readme
//
gulp.task('docs', function (cb) {

    // Copy generated svg files to be used staticly
    // in docs for previewing overlays
    gulp.src([options.dist + 'app/apps-filetree-folder-default.svg'])
        .pipe(gulp.dest(options.material + 'icons/'));
    gulp.src([options.dist + 'app/apps-filetree-folder-temp.svg'])
        .pipe(gulp.dest(options.material + 'icons/'));
    gulp.src([options.dist + 'app/apps-pagetree-page.svg'])
        .pipe(gulp.dest(options.material + 'icons/'));

    // Prepare Data
    var data = [];
    var folders = getFolders(options.dist);
    for (var folderCount = 0; folderCount < folders.length; folderCount++) {
        var folder = folders[folderCount];
        var iconFiles = getIcons(options.dist + folder);
        var icons = [];
        for (var i = 0; i < iconFiles.length; i++) {
            var file = options.dist + folder + '/' + iconFiles[i];
            icons[i] = {
                file: iconFiles[i],
                path: file,
                inline: getFileContents(file)
            };
        }
        data.push({
            folder: folder,
            title: folder.charAt(0).toUpperCase() + folder.slice(1),
            count: icons.length,
            icons: icons
        });
    }
    var opts = {
        data: {
            pkg: pkg,
            folders: data
        }
    };
    // Compile Readme
    gulp.src(options.readme.template)
        .pipe(twig(opts))
        .pipe(rename(options.readme.filename))
        .pipe(gulp.dest(options.readme.destination));
    // Compile Template
    gulp.src(options.index.template)
        .pipe(twig(opts))
        .pipe(rename(options.index.filename))
        .pipe(gulp.dest(options.index.destination));
    cb();

});


//
// Default Task
//
gulp.task('default', function (cb) {
    sequence('clean', 'min', 'docs')(cb);
});
