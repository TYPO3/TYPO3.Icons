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
const merge = require('deepmerge');
const execSync = require('child_process').execSync;

const minifyCSS = require('gulp-clean-css');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');


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
    dist_svgs: './dist/svgs/',
    dist_sprites: './dist/sprites/',
    assets: './assets/',
    docs: './docs/',
    meta: './meta/',
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

function getMetaFiles(dir) {
    return fs.readdirSync(dir)
        .filter(function (file) {
            var fileExtension = path.extname(path.join(dir, file));
            if (fileExtension === ".yaml") {
                return true;
            } else {
                return false;
            }
        });
}

function getCategories() {
    let categories = getFolders(options.src);
    return categories.map((category) => {
        let icons = getIcons(path.join(options.dist_svgs, category)).map((icon) => { return path.basename(icon, '.svg') });
        return {
            identifier: category,
            title: category.charAt(0).toUpperCase() + category.slice(1),
            sprite: 'sprites/' + category + '.svg',
            rendering: options.rendering[category] ?? {},
            icons: icons,
            count: icons.length
        };
    });
}

function getMetaDataFileName(identifier, folder) {
    return path.join(options.meta, folder, identifier + '.yaml' );
}

function getMetaData(identifier, folder) {
    let defaultmeta = {
        alias: [
        ],
        changes: [
        ],
        tags: [
        ]
    };
    let metafile = path.join(options.meta, folder, identifier + '.yaml' );
    let metadata = {};
    if (fs.existsSync(metafile)) {
        metadata = yaml.safeLoad(fs.readFileSync(metafile, 'utf8'));
    }
    return merge.all([defaultmeta, metadata]);
}

function updateMetaData(identifier, folder, metadata) {
    let metafile = getMetaDataFileName(identifier, folder);
    if (!fs.existsSync(path.dirname(metafile))){
        fs.mkdirSync(path.dirname(metafile));
    }
    fs.writeFileSync(metafile, yaml.safeDump(metadata), 'utf8');
}

function getVersionChanges(identifier, folder) {
    let filename = path.join(options.src, folder, identifier + '.svg');
    let commithashes = execSync('git log --follow --pretty=format:"%H" ' + filename).toString().split("\n");
    let fileversions = {};
    for (let key in commithashes) {
        let hashversions = execSync('git tag --contains ' + commithashes[key]).toString().split("\n");
        for (let versionKey in hashversions) {
            if (hashversions[versionKey].length > 0) {
                hashversion = hashversions[versionKey].charAt(0) === 'v' ? hashversions[versionKey].substr(1) : hashversions[versionKey];
                fileversions[hashversion] = hashversion;
            }
        }
    }
    let versions = [];
    for (let key in fileversions) {
        versions.push(key);
    }
    return sortVersions(versions);
}

function sortVersions(versions) {
    return versions.sort((a, b) => a.localeCompare(b, undefined, { numeric:true }) );
}

function generateVersionData(identifier, folder) {
    let metadata = getMetaData(identifier, folder)
    metadata.changes = getVersionChanges(identifier, folder);
    updateMetaData(identifier, folder, metadata);
}

function getData() {
    let data = {};
        data.icons = {};
        data.aliases = {};
    let folders = getFolders(options.dist_svgs);
    for (var folderCount = 0; folderCount < folders.length; folderCount++) {
        let folder = folders[folderCount];
        let iconFiles = getIcons(path.join(options.dist_svgs, folder));
        for (var i = 0; i < iconFiles.length; i++) {
            let file = path.join('svgs', folder, iconFiles[i]);
            let identifier = path.basename(file, '.svg');
            let metaData = getMetaData(identifier, folder);
            if (metaData.alias.length > 0) {
                for (let aliasKey in metaData.alias) {
                    data.aliases[metaData.alias[aliasKey]] = identifier;
                }
            }
            data.icons[identifier] = {};
            data.icons[identifier].identifier = identifier;
            data.icons[identifier].category   = folder;
            data.icons[identifier].svg        = 'svgs/' + folder + '/' + identifier + '.svg';
            data.icons[identifier].sprite     = 'sprites/' + folder + '.svg' + '#' + identifier;
        }
    }
    return data;
}


//
// Clean SVGs
//
gulp.task('clean', () => {
    let tasks = [];
    tasks.push(del([options.dist, options.docs], { force: true }));
    tasks.push(new Promise((resolve) => {
        let folders = getFolders(options.meta);
        for (var folderCount = 0; folderCount < folders.length; folderCount++) {
            let folder = folders[folderCount];
            let files = getMetaFiles(path.join(options.meta, folder));
            for (var i = 0; i < files.length; i++) {
                let file = path.join(folder, files[i]);
                let identifier = path.basename(file, '.yaml');
                fs.stat(path.join(options.src, folder, identifier + '.svg'), (error) => {
                    if (error !== null && error.code === 'ENOENT') {
                        del(path.join(options.meta, file), { force: true });
                    }
                });
            }
        }
        resolve();
    }));

    return Promise.all(tasks);
});


//
// Sass
//
gulp.task('sass', () => {
    return gulp.src(path.join(options.assets, 'scss/icons.scss'))
        .pipe(gulp.dest(options.dist))
        .pipe(sass().on('error', sass.logError))
        .pipe(minifyCSS())
        .pipe(gulp.dest(options.dist));
});

//
// Minify SVGs
//
gulp.task('min', () => {
    return gulp.src([options.src + '**/*.svg'])
        .pipe(svgmin(getSvgoConfig()))
        .pipe(gulp.dest(options.dist_svgs));
});


//
// SVG Sprites
//
gulp.task('sprites', () => {
    let processFolder = (folder) => {
        return new Promise((resolve, reject) => {
            gulp.src([path.join(options.dist_svgs, folder) + '/*.svg'])
                .pipe(svgSprite({
                    svg: {
                        rootAttributes: {
                            class: 'typo3-icons-' + folder,
                            style: 'display: none;'
                        },
                        namespaceIDs: true,
                        namespaceClassnames: false
                    },
                    mode: {
                        symbol: {
                            dest: '',
                            sprite: folder + '.svg'
                        }
                    }
                }))
                .on('error', reject)
                .pipe(gulp.dest(options.dist_sprites))
                .on('end', resolve);
        });
    };
    return Promise.all(getFolders(options.dist_svgs).map(processFolder));
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
// Build Versions
//
gulp.task('build-versions', () => {
    return new Promise((resolve) => {
    let folders = getFolders(options.src);
    for (var folderCount = 0; folderCount < folders.length; folderCount++) {
        var folder = folders[folderCount];
        var iconFiles = getIcons(options.src + folder);
        for (var i = 0; i < iconFiles.length; i++) {
            let file = path.join(folder, iconFiles[i]);
            let identifier = path.basename(file, '.svg');
            generateVersionData(identifier, folder);
        }
    }
        resolve();
});
});

//
// Compile Readme
//
gulp.task('docs', function (cb) {

    // Build Docs CSS
    gulp.src(path.join(options.assets, 'scss/docs.scss'))
        .pipe(sass().on('error', sass.logError))
        .pipe(minifyCSS())
        .pipe(gulp.dest(path.join(options.docs, 'assets', 'css')))

    // Copy static assets
    gulp.src([path.join(options.assets, '**/*'),
            '!' + path.join(options.assets, '**/*(*.scss)'),
        ], { base: options.assets })
        .pipe(gulp.dest(path.join(options.docs, 'assets')));
    gulp.src([path.join(options.dist, '**/*')], { base: options.dist } )
        .pipe(gulp.dest(path.join(options.docs, 'dist')));

    // Fetch generated data
    let typo3 = JSON.parse(fs.readFileSync('./typo3.json', 'utf8'))
    let categories = getCategories();
    let data = JSON.parse(fs.readFileSync(options.dist + 'icons.json', 'utf8'));
    let icons = data.icons;
    for(let iconKey in icons) {
        icons[iconKey]._meta = getMetaData(icons[iconKey].identifier, icons[iconKey].category);
        icons[iconKey]._inline = fs.readFileSync(path.join(options.dist, icons[iconKey].svg), 'utf8')
    }

    // README
    gulp.src('./tmpl/markdown/README.md.twig')
        .pipe(twig({
            data: {
                pkg: pkg,
                typo3: typo3,
            }
        }))
        .pipe(rename('README.md'))
        .pipe(gulp.dest(path.join('.')));

    // Index
    gulp.src('./tmpl/html/docs/index.html.twig')
        .pipe(twig({
            data: {
                pkg: pkg,
                typo3: typo3,
                icons: icons,
                category: {},
                categories: categories,
                rendering: {},
                pathPrefix: '',
            }
        }))
        .pipe(rename('index.html'))
        .pipe(gulp.dest(path.join('./docs')));

    // Build pages
    for (let categoryKey in categories) {
        let category = categories[categoryKey];
        gulp.src('./tmpl/html/docs/section.html.twig')
            .pipe(twig({
                data: {
                    pkg: pkg,
                    typo3: typo3,
                    icons: icons,
                    category: category,
                    categories: categories,
                    pathPrefix: '../',
                }
            }))
            .pipe(rename(category.identifier + '.html'))
            .pipe(gulp.dest(path.join('./docs/icons')));
        for (let iconKey in category.icons) {
            let iconIdentifier = category.icons[iconKey];
            let icon = icons[iconIdentifier];
            gulp.src('./tmpl/html/docs/single.html.twig')
                .pipe(twig({
                    data: {
                        pkg: pkg,
                        typo3: typo3,
                        icon: icon,
                        icons: icons,
                        category: category,
                        categories: categories,
                        pathPrefix: '../../',
                    }
                }))
                .pipe(rename(iconIdentifier + '.html'))
                .pipe(gulp.dest(path.join('./docs/icons', category.identifier)));
        }
    }

    cb();
});


//
// Default Task
//
gulp.task('build', gulp.series('clean', 'sass', 'min', 'sprites', 'data', 'docs'));
gulp.task('default', gulp.series('build'));
