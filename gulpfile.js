//
// Require
//
const fs = require('fs');
const pkg = require('./package.json');
const path = require('path');
const del = require('del');
const twig = require('gulp-twig');
const svgmin = require('gulp-svgmin');
const rename = require('gulp-rename');
const gulp = require('gulp');


//
// Options
//
const options = {
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
        assets: {
            template: './tmpl/html/docs/files.html.twig',
            filename: 'files.html',
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
        },
        install: {
            template: './tmpl/html/docs/install.html.twig',
            filename: 'install.html',
            destination: './docs'
        }
    },
    src: './src/',
    dist: './dist/',
    assets: './assets/',
    docs: './docs/',
    docs_images: './docs/images/',
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
function getData() {
    let data = {};
    let folders = getFolders(options.dist);
    for (var folderCount = 0; folderCount < folders.length; folderCount++) {
        var folder = folders[folderCount];
        var iconFiles = getIcons(options.dist + folder);
        var icons = [];
        for (var i = 0; i < iconFiles.length; i++) {
            let file = folder + '/' + iconFiles[i];
            let relativeFile = options.dist + file;
            icons[i] = {
                identifier: path.basename(file, '.svg'),
                file: iconFiles[i],
                folder: folder,
                path: file,
                inline: getFileContents(relativeFile)
            };
        }
        data[folder] = {
            title: folder.charAt(0).toUpperCase() + folder.slice(1),
            folder: folder,
            count: icons.length,
            icons: icons
        };
    }
    return data;
}


//
// Clean SVGs
//
gulp.task('clean', function (cb) {
    return del([options.dist, options.docs], {force:true});
});


//
// Minify SVGs
//
gulp.task('min', () => {
    return gulp.src([options.src + '**/*.svg'])
        .pipe(svgmin({
            plugins: [
                { removeDimensions: true }
            ]
        }))
        .pipe(gulp.dest(options.docs_images))
        .pipe(gulp.dest(options.dist));
});


//
// Data
//
gulp.task('data', (cb) => {
    let data = JSON.stringify(getData(), null, 2);
    fs.writeFile(options.dist + 'icons.json', data, 'utf8', () => {
        cb();
    });
});


//
// Compile Readme
//
gulp.task('docs', function (cb) {

    // Copy generated svg files to be used staticly
    // in docs for previewing overlays
    gulp.src([options.dist + 'apps/apps-filetree-folder-default.svg'])
        .pipe(gulp.dest(options.material + 'icons/'));
    gulp.src([options.dist + 'apps/apps-filetree-folder-temp.svg'])
        .pipe(gulp.dest(options.material + 'icons/'));
    gulp.src([options.dist + 'apps/apps-pagetree-page.svg'])
        .pipe(gulp.dest(options.material + 'icons/'));
    gulp.src([options.assets + 'favicon.ico'])
        .pipe(gulp.dest(options.docs));

    // Fetch generated data
    let data = JSON.parse(fs.readFileSync(options.dist + 'icons.json', 'utf8'));

    // Compile templates
    for (var key in options.files) {
        if (options.files.hasOwnProperty(key)) {
            let file = options.files[key];
            let opts = {
                data: {
                    key: key,
                    pkg: pkg,
                    folders: data,
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
gulp.task('build', gulp.series('clean', 'min', 'data','docs'));
gulp.task('default', gulp.series('build'));
