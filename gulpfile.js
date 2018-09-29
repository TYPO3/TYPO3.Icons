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
    rename = require('gulp-rename');


//
// Options
//
var options = {
    files: {
        readme: {
            template: './tmpl/markdown/README.twig',
            filename: 'README.md',
            destination: '.'
        },
        index: {
            template: './tmpl/html/docs/index.html.twig',
            filename: 'index.html',
            destination: './docs'
        },
        action: {
            template: './tmpl/html/docs/action.html.twig',
            filename: 'action.html',
            destination: './docs'
        },
        module: {
            template: './tmpl/html/docs/module.html.twig',
            filename: 'module.html',
            destination: './docs'
        },
        overlay: {
            template: './tmpl/html/docs/overlay.html.twig',
            filename: 'overlay.html',
            destination: './docs'
        },
        form: {
            template: './tmpl/html/docs/form.html.twig',
            filename: 'form.html',
            destination: './docs'
        },
        apps: {
            template: './tmpl/html/docs/apps.html.twig',
            filename: 'apps.html',
            destination: './docs'
        },
        content: {
            template: './tmpl/html/docs/content.html.twig',
            filename: 'content.html',
            destination: './docs'
        },
        mimetypes: {
            template: './tmpl/html/docs/mimetypes.html.twig',
            filename: 'mimetypes.html',
            destination: './docs'
        },
        misc: {
            template: './tmpl/html/docs/misc.html.twig',
            filename: 'misc.html',
            destination: './docs'
        }
    },
    src: './src/',
    dist: './dist/',
    docs: './docs/images/',
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
    gulp.src([options.docs + '**/*.svg'])
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
        .pipe(gulp.dest(options.docs))
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
        data[folder] = {
            folder: folder,
            title: folder.charAt(0).toUpperCase() + folder.slice(1),
            count: icons.length,
            icons: icons
        };
    }

    // Compile templates
    for (var key in options.files) {
        if (options.files.hasOwnProperty(key)) {
            let file = options.files[key];
            let opts = {
                data: {
                    key: key,
                    pkg: pkg,
                    folders: data
                }
            };
            gulp.src(file.template)
                .pipe(twig(opts))
                .pipe(rename(file.filename))
                .pipe(gulp.dest(file.destination));
        }
    }
    cb();
});


//
// Default Task
//
gulp.task('default', ['clean', 'min', 'docs']);
