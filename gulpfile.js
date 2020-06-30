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
const svgSprite = require('gulp-svg-sprite');
const yaml = require('js-yaml');


//
// Options
//
const options = {
    rendering: {
        actions: {
            preview: true,
            buttons: true,
        },
        apps: {
            preview: true,
            buttons: true,
        },
        avatar: {
            preview: true,
            buttons: true,
        },
        content: {
            preview: true,
            buttons: true,
        },
        default: {
            preview: true,
            buttons: true,
        },
        files: {
            preview: true,
        },
        form: {
            preview: true,
            buttons: true,
        },
        information: {
            preview: true,
        },
        install: {
            preview: true,
        },
        mimetypes: {
            preview: true,
            buttons: true,
        },
        miscellaneous: {
            preview: true,
            buttons: true,
        },
        module: {
            preview: true,
        },
        modulegroup: {
            preview: true,
        },
        overlay: {
            overlay: true,
        },
        spinner: {
            preview: true,
            buttons: true,
            spinning: true,
        },
        status: {
            preview: true,
            buttons: true,
        },
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
function getSvgoConfig() {
    let config = fs.readFileSync('svgo.yaml', 'utf8');
    config = yaml.safeLoad(config)

    return config;
}
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
    return del([options.dist, options.docs], { force: true });
});


//
// Minify SVGs
//
gulp.task('min', () => {
    return gulp.src([options.src + '**/*.svg'])
        .pipe(svgmin(getSvgoConfig()))
        .pipe(gulp.dest(options.docs_images))
        .pipe(gulp.dest(options.dist));
});


//
// SVG Sprite
//
gulp.task('sprites', () => {
    return gulp.src([options.dist + 'actions/*.svg'])
        .pipe(svgSprite({
            svg: {
                rootAttributes: {
                    class: 'typo3-icons',
                    style: 'display: none;'
                },
                namespaceIDs: true,
                namespaceClassnames: false
            },
            mode: {
                symbol: {
                    dest: '',
                    sprite: "actions.symbols.svg"
                }
            }
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

    // README
    gulp.src('./tmpl/markdown/README.md.twig')
        .pipe(twig({
            data: {
                pkg: pkg,
                data: data,
                section: {},
                rendering: {},
            }
        }))
        .pipe(rename('README.md'))
        .pipe(gulp.dest(path.join('.')));

    // Index
    gulp.src('./tmpl/html/docs/index.html.twig')
        .pipe(twig({
            data: {
                pkg: pkg,
                data: data,
                section: {},
                rendering: {},
                pathPrefix: '',
            }
        }))
        .pipe(rename('index.html'))
        .pipe(gulp.dest(path.join('./docs')));

    // Build pages
    for (let sectionKey in data) {
        let section = data[sectionKey];
        gulp.src('./tmpl/html/docs/section.html.twig')
            .pipe(twig({
                data: {
                    pkg: pkg,
                    data: data,
                    section: section,
                    rendering: options.rendering[section.folder] ?? {},
                    pathPrefix: '',
                }
            }))
            .pipe(rename(section.folder + '.html'))
            .pipe(gulp.dest(path.join('./docs')));
        for (let iconKey in section.icons) {
            let icon = section.icons[iconKey];
            gulp.src('./tmpl/html/docs/single.html.twig')
                .pipe(twig({
                    data: {
                        pkg: pkg,
                        data: data,
                        section: section,
                        rendering: options.rendering[section.folder] ?? {},
                        icon: icon,
                        pathPrefix: '../',
                    }
                }))
                .pipe(rename(icon.identifier + '.html'))
                .pipe(gulp.dest(path.join('./docs', section.folder)));
        }
    }

    cb();
});


//
// Default Task
//
gulp.task('build', gulp.series('clean', 'min', 'data', 'sprites', 'docs'));
gulp.task('default', gulp.series('build'));
