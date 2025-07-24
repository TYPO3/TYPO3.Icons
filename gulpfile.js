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
const { exec } = require('child_process');

const minifyCSS = require('gulp-clean-css');
const sass = require('gulp-sass')(require('sass'));


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
    dist_scss: './dist/scss/',
    assets: './assets/',
    site: './_site/',
    meta: './meta/',
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
        metadata = yaml.load(fs.readFileSync(metafile, 'utf8'));
    }
    return merge.all([defaultmeta, metadata]);
}

function updateMetaData(identifier, folder, metadata) {
    let metafile = getMetaDataFileName(identifier, folder);
    if (!fs.existsSync(path.dirname(metafile))){
        fs.mkdirSync(path.dirname(metafile));
    }
    fs.writeFileSync(metafile, yaml.dump(metadata), 'utf8');
}

function getVersionChanges(identifier, folder) {
    let filename = path.join(options.src, folder, identifier + '.svg');
    let commithashes = execSync('git log --find-renames --find-renames=100% --pretty=format:"%H" ' + filename).toString().split("\n");
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

function escapeSvg(svg) {
    const charReplacementMap = {
        '"': '\'',
        '#': '%23',
        '<': '%3c',
        '>': '%3e'
    };
    const regex = new RegExp('[' + Object.keys(charReplacementMap).join('') + ']', 'g');
    return svg.replace(regex, c => charReplacementMap[c]);
}

function playSound() {
    // Try different sound commands based on platform (silently)
    const soundCommands = [
        'echo -e "\\a"',  // Terminal bell
        'paplay /usr/share/sounds/alsa/Front_Left.wav 2>/dev/null',  // Linux
        'afplay /System/Library/Sounds/Glass.aiff 2>/dev/null',  // macOS
        'powershell -c "[console]::beep(800,200)" 2>$null'  // Windows
    ];
    
    soundCommands.forEach(cmd => {
        exec(cmd, { stdio: 'ignore' }, () => {}); // Completely silent
    });
    
    console.log('✅ Build complete!');
}

//
// Icons Clean
//
gulp.task('icons-clean', () => {
    return del([options.dist], { force: true });
});


//
// Icons Sass
//
gulp.task('icons-sass', () => {
    let tasks = [];
    tasks.push(new Promise((resolve) => {
        gulp.src(path.join(options.assets, 'scss/icons.scss'))
            .pipe(gulp.dest(options.dist))
            .pipe(sass().on('error', sass.logError))
            .pipe(minifyCSS())
            .pipe(gulp.dest(options.dist))
            .on('end', resolve);
    }));
    tasks.push(new Promise((resolve) => {
        gulp.src(path.join(options.assets, 'scss/icons-bootstrap.scss'))
            .pipe(gulp.dest(options.dist))
            .pipe(sass().on('error', sass.logError))
            .pipe(minifyCSS())
            .pipe(gulp.dest(options.dist))
            .on('end', resolve);
    }));
    return Promise.all(tasks);
});


//
// Icons Minify SVGs
//
gulp.task('icons-min', () => {
    return gulp.src([options.src + '**/*.svg'])
        .pipe(svgmin())
        .pipe(gulp.dest(options.dist_svgs));
});


//
// Icons SVG Sprites
//
gulp.task('icons-sprites', () => {
    let processFolder = (folder) => {
        return new Promise((resolve, reject) => {
            // Get sorted list of SVG files
            const svgFiles = getIcons(path.join(options.dist_svgs, folder))
                .sort()
                .map(file => path.join(options.dist_svgs, folder, file));
            
            gulp.src(svgFiles)
                .pipe(svgSprite({
                    svg: {
                        rootAttributes: {
                            class: 'typo3-icons-' + folder,
                            style: 'display: none;'
                        },
                        namespaceIDs: true,
                        namespaceClassnames: false
                    },
                    shape: {
                        transform: [
                            {
                                svgo: {
                                    plugins: [
                                        {
                                            name: 'preset-default',
                                        },
                                        {
                                            name: 'removeAttrs',
                                            params: {
                                                attrs: 'xml:space',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
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
// Icons Data
//
gulp.task('icons-data', (cb) => {
    let data = JSON.stringify(getData(), null, 2);
    fs.writeFile(options.dist + 'icons.json', data, 'utf8', (err) => {
        if (err) {
            cb(err);
        } else {
            cb();
        }
    });
});

//
// Icon variables
//
gulp.task('icons-variables', async (cb) => {
    try {
        const data = getData();

        if (!fs.existsSync(options.dist_scss)){
            fs.mkdirSync(options.dist_scss, { recursive: true });
        }

        // Clear existing files first
        const categories = getCategories();
        for (const category of Object.values(categories)) {
            const categoryFile = options.dist_scss + `icons-variables-${category.identifier}.scss`;
            if (fs.existsSync(categoryFile)) {
                fs.unlinkSync(categoryFile);
            }
        }
        const mainFile = options.dist_scss + `icons-variables.scss`;
        if (fs.existsSync(mainFile)) {
            fs.unlinkSync(mainFile);
        }

        // Write icon variables (sorted by identifier)
        const sortedIcons = Object.entries(data.icons).sort(([a], [b]) => a.localeCompare(b));
        const categoryFiles = {};
        
        // Group by category and prepare content
        for (const [identifier, icon] of sortedIcons) {
            if (!categoryFiles[icon.category]) {
                categoryFiles[icon.category] = [];
            }
            const inlineIcon = fs.readFileSync(path.join(options.dist, icon.svg), 'utf8');
            const scssVariable = `$icon-${identifier}: url("data:image/svg+xml,${escapeSvg(inlineIcon)}") !default;`;
            categoryFiles[icon.category].push(scssVariable);
        }
        
        // Write each category file with sorted content
        const writePromises = [];
        for (const [category, variables] of Object.entries(categoryFiles)) {
            writePromises.push(
                new Promise((resolve, reject) => {
                    fs.writeFile(options.dist_scss + `icons-variables-${category}.scss`, variables.join('\n') + '\n', 'utf8', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                })
            );
        }

        await Promise.all(writePromises);

        // Write main imports file
        const importPromises = [];
        for (const category of Object.values(categories).sort((a, b) => a.identifier.localeCompare(b.identifier))) {
            const scssInclude = `@import 'icons-variables-${category.identifier}';`;
            importPromises.push(
                new Promise((resolve, reject) => {
                    fs.appendFile(options.dist_scss + `icons-variables.scss`, scssInclude + "\n", 'utf8', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                })
            );
        }

        await Promise.all(importPromises);
        cb();
    } catch (err) {
        cb(err);
    }
});


//
// Versions History
//
gulp.task('version-history', () => {

    let tasks = [];
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
    tasks.push(new Promise((resolve) => {
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
    }));

    return Promise.all(tasks);
});


/**
 * Docs
 */
gulp.task('site-clean', () => {
    return del([options.site], { force: true });
});
gulp.task('site-build', function (cb) {
    let tasks = [];

    // Build Docs CSS
    tasks.push(new Promise((resolve, reject) => {
        gulp.src(path.join(options.assets, 'scss/docs.scss'))
            .pipe(sass().on('error', sass.logError))
            .pipe(minifyCSS())
            .pipe(gulp.dest(path.join(options.site, 'assets', 'css')))
            .on('end', resolve)
            .on('error', reject);
    }));

    // Copy static assets
    tasks.push(new Promise((resolve, reject) => {
        gulp.src([path.join(options.assets, '**/*'),
                '!' + path.join(options.assets, '**/*(*.scss)'),
            ], { base: options.assets })
            .pipe(gulp.dest(path.join(options.site, 'assets')))
            .on('end', resolve)
            .on('error', reject);
    }));
    
    tasks.push(new Promise((resolve, reject) => {
        gulp.src([path.join(options.dist, '**/*')], { base: options.dist } )
            .pipe(gulp.dest(path.join(options.site, 'dist')))
            .on('end', resolve)
            .on('error', reject);
    }));

    // Wait for asset copying to complete before processing templates
    Promise.all(tasks).then(() => {
        let templateTasks = [];
        
        // Fetch generated data
        let typo3 = JSON.parse(fs.readFileSync('./typo3.json', 'utf8'))
        let categories = getCategories();
        let data = JSON.parse(fs.readFileSync(options.dist + 'icons.json', 'utf8'));
        let icons = data.icons;
        for (let iconKey in icons) {
            const iconContent = fs.readFileSync(path.join(options.dist, icons[iconKey].svg), 'utf8');
            icons[iconKey]._meta = getMetaData(icons[iconKey].identifier, icons[iconKey].category);
            icons[iconKey]._inline = iconContent
            icons[iconKey]._inlineEscaped = escapeSvg(iconContent)
        }

        // Index
        templateTasks.push(new Promise((resolve, reject) => {
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
                .pipe(gulp.dest(path.join(options.site)))
                .on('end', resolve)
                .on('error', reject);
        }));

        // Guide
        templateTasks.push(new Promise((resolve, reject) => {
            gulp.src('./tmpl/html/docs/guide.html.twig')
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
                .pipe(rename('guide.html'))
                .pipe(gulp.dest(path.join(options.site)))
                .on('end', resolve)
                .on('error', reject);
        }));

        // Build pages
        for (let categoryKey in categories) {
            let category = categories[categoryKey];
            templateTasks.push(new Promise((resolve, reject) => {
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
                    .pipe(gulp.dest(path.join(options.site, 'icons')))
                    .on('end', resolve)
                    .on('error', reject);
            }));
            
            for (let iconKey in category.icons) {
                let iconIdentifier = category.icons[iconKey];
                let icon = icons[iconIdentifier];
                templateTasks.push(new Promise((resolve, reject) => {
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
                        .pipe(gulp.dest(path.join(options.site, 'icons', category.identifier)))
                        .on('end', resolve)
                        .on('error', reject);
                }));
            }
        }

        Promise.all(templateTasks).then(() => {
            cb();
        }).catch(cb);
    }).catch(cb);
});


//  
// Watch Task with completion callbacks
//
function svgNotify(cb) {
    playSound();
    cb();
}

function scssNotify(cb) {
    playSound();
    cb();
}

function templateNotify(cb) {
    playSound();
    cb();
}

gulp.task('watch-svg-complete', gulp.series('icons-min', 'icons-sprites', 'icons-data', 'icons-variables', 'site-build', svgNotify));

gulp.task('watch-scss-complete', gulp.series('icons-sass', 'site-build', scssNotify));

gulp.task('watch-template-complete', gulp.series('site-build', templateNotify));

gulp.task('watch', () => {
    // Watch SVG source files
    gulp.watch([options.src + '**/*.svg'], gulp.series('watch-svg-complete'));
    
    // Watch SCSS files
    gulp.watch([options.assets + 'scss/**/*.scss'], gulp.series('watch-scss-complete'));
    
    // Watch template files
    gulp.watch(['./tmpl/**/*.twig', './typo3.json'], gulp.series('watch-template-complete'));
    
    console.log('🔍 Watching for file changes...');
});

//
// Tasks
//
gulp.task('icons', gulp.series(
    'icons-clean',
    'icons-sass',
    'icons-min',
    'icons-sprites',
    'icons-data',
    'icons-variables'
));
gulp.task('default', gulp.series(
    'icons'
));
gulp.task('version', gulp.series(
    'version-history'
));
gulp.task('site', gulp.series(
    'site-clean',
    'site-build'
));
gulp.task('dev', gulp.series(
    'icons',
    'site',
    'watch'
));
