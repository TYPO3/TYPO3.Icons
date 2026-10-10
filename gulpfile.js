//
// Require
//
const fs = require('fs');
const pkg = require('./package.json');
const path = require('path');
const { deleteAsync, deleteSync } = require('del');
const twig = require('gulp-twig');
const twigEngine = require('twig');
const svgmin = require('gulp-svgmin');
const rename = require('gulp-rename');
const gulp = require('gulp');
const svgSprite = require('gulp-svg-sprite');
const yaml = require('js-yaml');
const merge = require('deepmerge');
const execSync = require('child_process').execSync;
const { exec } = require('child_process');

// A code sample written into a template carries the template's indentation.
// The first line of a Twig string literal begins right after the opening quote
// and so has none, while every line under it is indented to wherever the call
// sits — which is why `|trim` cannot fix it: it only touches the two ends of
// the whole string, and the damage is at the start of every line but the first.
//
// So the common indent of the lines after the first comes off, and only that.
// A snippet that nests — an SVG, a Lit template — keeps its own structure,
// because what is removed is what every one of its lines shares.
twigEngine.extendFilter('dedent', (value) => {
    let lines = String(value).split('\n');
    let rest = lines.slice(1).filter((line) => line.trim().length > 0);
    if (rest.length === 0) {
        return String(value);
    }
    let common = Math.min(...rest.map((line) => line.match(/^ */)[0].length));
    if (common === 0) {
        return String(value);
    }
    return [lines[0], ...lines.slice(1).map((line) => line.slice(common))].join('\n');
});

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
            menuview: true,
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
    // Reader-facing names. The folder names remain stable for package paths
    // and URLs; these labels explain what a category contains before somebody
    // has to learn the repository vocabulary.
    titles: {
        actions: 'Actions',
        apps: 'Page and file trees',
        avatar: 'Avatars',
        content: 'Content elements',
        default: 'Fallbacks',
        files: 'Folders',
        form: 'Forms',
        information: 'System information',
        install: 'Install tool',
        mimetypes: 'File types',
        miscellaneous: 'Placeholders',
        module: 'Backend modules',
        overlay: 'Overlays',
        spinner: 'Loading',
        status: 'User status',
    },
    // What each category answers, in one sentence. Written here rather than in
    // the template because it is a fact about the category, not about the page
    // that happens to show it.
    descriptions: {
        actions: 'Icons for common interface actions such as adding, editing, saving, deleting, moving and navigating.',
        apps: 'Page-tree and file-tree icons for node types, permissions, visibility states and drag-and-drop actions.',
        avatar: 'The default avatar shown when a backend user has not uploaded a profile image.',
        content: 'Icons for TYPO3 content elements, from text and media to forms, navigation and structured layouts.',
        default: 'Fallback icons for identifiers that cannot be resolved to a specific asset.',
        files: 'Folder icons for the file list, including common folder types and states.',
        form: 'Icons for the TYPO3 form editor, from text fields and checkboxes to file uploads and finishers.',
        information: 'Icons for TYPO3 version, operating system and other installation information.',
        install: 'Icons for environment checks, cache operations, database tools and other installation tasks.',
        mimetypes: 'File-type icons for documents, images, archives, source files, audio and video.',
        miscellaneous: 'General-purpose placeholders for content or objects without a dedicated icon.',
        module: 'Large-format icons designed for TYPO3 backend modules and the module menu.',
        overlay: 'Compact status marks that add meaning to another icon, including hidden, locked, translated and deleted.',
        spinner: 'The animated loading indicator for processes that are still in progress.',
        status: 'Icons for backend users, administrators, groups and authentication states.',
    },
    // Categories a reader browsing the set has little reason to open: a single
    // placeholder, a fallback, a handful of folder states. They stay in the
    // navigation and keep their pages, but they stop competing for attention
    // with the categories somebody actually came for.
    minor: [
        'avatar',
        'default',
        'files',
        'information',
        'miscellaneous',
        'spinner',
    ],
    // Which categories the front page may open with. Named rather than derived:
    // the wall is the first thing a reader sees and what belongs on it is an
    // editorial decision, not a side effect of a category being large.
    //
    // Overlays are out because they are fragments meant to sit in the corner of
    // another icon, and alone in a box they read as clipped. The minor
    // categories are out for the reason they are minor: a single placeholder or
    // fallback says nothing about the set. Shorten this list to narrow the wall;
    // fewer entries than tiles is fine, the browser draws from what it is given.
    showcase: [
        'actions',
        'content',
        'form',
        'mimetypes',
    ],
    src: './src/',
    dist: './dist/',
    dist_svgs: './dist/svgs/',
    dist_sprites: './dist/sprites/',
    dist_scss: './dist/scss/',
    assets: './assets/',
    site: './_site/',
    // Where the built site is published. Only llms.txt needs it: it is read
    // away from the page it sits on, so the relative paths the rest of the
    // build works in lose their meaning there and every link has to be whole.
    siteUrl: 'https://typo3.github.io/TYPO3.Icons/',
    soul: './node_modules/@typo3/soul-frontend/dist/',
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
            title: options.titles[category] ?? category.charAt(0).toUpperCase() + category.slice(1),
            description: options.descriptions[category] ?? '',
            minor: options.minor.includes(category),
            sprite: 'sprites/' + category + '.svg',
            rendering: options.rendering[category] ?? {},
            icons: icons,
            count: icons.length
        };
    });
}

/**
 * The navigation every page shares, as one tree: the bar reads it as sections,
 * the rail as the pages of the section the reader is in. Built here rather than
 * in Twig because both layouts need the same tree and a template cannot hand
 * one back.
 */
function buildNav(categories, pathPrefix, page, currentCategory) {
    let inSection = page === 'section' || page === 'single';

    let entryOf = (category) => {
        return {
            label: category.title,
            href: pathPrefix + 'icons/' + category.identifier + '.html',
            current: inSection && category.identifier === currentCategory,
        };
    };
    let categoryPages = [
        ...categories.filter((category) => !category.minor).map(entryOf),
        ...categories.filter((category) => category.minor).map(entryOf),
    ];
    let icons = {
        label: 'Icons',
        href: pathPrefix + 'icons.html',
        front: true,
        current: page === 'icons',
        here: inSection,
        items: categoryPages,
    };
    let useIcons = {
        label: 'Usage',
        href: pathPrefix + 'guide/usage.html',
        front: true,
        current: page === 'guide-usage',
        here: ['guide-installation', 'guide-backend-usage', 'guide-external-usage', 'guide-compatibility'].includes(page),
        items: [
            { label: 'Installation', href: pathPrefix + 'guide/installation.html', current: page === 'guide-installation' },
            { label: 'Backend usage', href: pathPrefix + 'guide/backend-usage.html', current: page === 'guide-backend-usage' },
            { label: 'External usage', href: pathPrefix + 'guide/external-usage.html', current: page === 'guide-external-usage' },
            { label: 'Version compatibility', href: pathPrefix + 'guide/compatibility.html', current: page === 'guide-compatibility' },
        ],
    };
    let design = {
        label: 'Design guidelines',
        href: pathPrefix + 'guide.html',
        front: true,
        current: page === 'guide',
        here: ['guide-drawing', 'guide-modules', 'guide-bidi'].includes(page),
        items: [
            { label: 'Design foundations', href: pathPrefix + 'guide.html', current: page === 'guide' },
            { label: 'Drawing an icon', href: pathPrefix + 'guide/drawing.html', current: page === 'guide-drawing' },
            { label: 'Module icons', href: pathPrefix + 'guide/modules.html', current: page === 'guide-modules' },
            { label: 'Bidirectional support', href: pathPrefix + 'guide/bidi.html', current: page === 'guide-bidi' },
        ],
    };
    let contribute = {
        label: 'Contribute',
        href: pathPrefix + 'guide/contributing.html',
        front: true,
        current: page === 'guide-contributing',
        here: ['guide-contributing-icons', 'guide-contributing-development', 'guide-contributing-releases'].includes(page),
        items: [
            { label: 'Overview', href: pathPrefix + 'guide/contributing.html', current: page === 'guide-contributing' },
            { label: 'Icon changes', href: pathPrefix + 'guide/contributing-icons.html', current: page === 'guide-contributing-icons' },
            { label: 'Development setup', href: pathPrefix + 'guide/contributing-development.html', current: page === 'guide-contributing-development' },
            { label: 'Release process', href: pathPrefix + 'guide/contributing-releases.html', current: page === 'guide-contributing-releases' },
        ],
    };

    // One canonical tree feeds every navigation surface. The bar receives the
    // whole tree; the rail receives the active branch from that same array.
    // No second list of labels or links exists to drift out of sync.
    let sections = [icons, useIcons, design, contribute];
    let tree = { label: 'TYPO3 Icons', items: sections };
    let section = sections.find((entry) => entry.current || entry.here) ?? icons;

    // And the trail, from the same tree. A breadcrumb is the path to a page,
    // which the tree already knows — written out on each template instead, it
    // had drifted: `guide.html` was "Guide" in a crumb and "Design guidelines"
    // in the bar, and "Icons" led to the front page in a crumb while the bar's
    // "Icons" led to the icon index.
    //
    // `here` is what marks an ancestor and `current` the page itself, so the
    // walk needs nothing the tree does not already carry. It stops at `current`
    // rather than descending past it, which is what keeps `guide.html` — a
    // section that is also the first page under itself — one step and not two.
    let trailOf = (entries) => {
        for (let entry of entries) {
            if (entry.current) {
                return [{ label: entry.label, href: entry.href }];
            }
            if (entry.here && entry.items) {
                let below = trailOf(entry.items);
                if (below.length) {
                    return [{ label: entry.label, href: entry.href }, ...below];
                }
            }
        }
        return [];
    };

    return {
        tree: tree,
        section: section,
        // The front page opens the trail. It is not a section of the tree — the
        // tree's own root is the site — so it is named from the root's label and
        // stated once here rather than at the head of fifteen templates.
        trail: [{ label: tree.label, href: pathPrefix + 'index.html' }, ...trailOf(sections)],
    };
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
            data.icons[identifier].bidi       = metaData.bidi ? true : false;
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
    return deleteAsync([options.dist], { force: true });
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

        // Write main forwards file (sorted to keep a stable order)
        const sortedCategories = Object.values(categories).sort((a, b) => a.identifier.localeCompare(b.identifier));
        const forwards = sortedCategories.map(category => `@forward 'icons-variables-${category.identifier}';`).join('\n') + '\n';
        await fs.promises.writeFile(options.dist_scss + `icons-variables.scss`, forwards, 'utf8');
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
                        deleteSync(path.join(options.meta, file), { force: true });
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


//
// Changelog Helper Functions
//
const COMMIT_TYPES = {
    'FEATURE': 'features',
    'BUGFIX': 'bugfixes',
    'TASK': 'tasks',
    '!!!': 'breaking',
    'BREAKING': 'breaking'
};

function categorizeCommits(latestTag) {
    const gitCommand = `git log ${latestTag}..HEAD --oneline --no-merges --grep="^\\[RELEASE\\]" --invert-grep`;
    const commits = execSync(gitCommand).toString().trim();

    if (!commits) {
        return null;
    }

    const categories = {
        breaking: [],
        features: [],
        bugfixes: [],
        tasks: [],
        other: []
    };

    const commitPattern = /^([a-f0-9]+)\s+\[([^\]]+)\]\s+(.+)$/;
    const fallbackPattern = /^([a-f0-9]+)\s+(.+)$/;

    commits.split('\n').forEach(line => {
        const match = line.match(commitPattern);

        if (match) {
            const [, hash, prefix, message] = match;
            const category = COMMIT_TYPES[prefix.toUpperCase()] || 'other';
            categories[category].push({ hash, prefix, message });
        } else {
            const fallbackMatch = line.match(fallbackPattern);
            if (fallbackMatch) {
                const [, hash, message] = fallbackMatch;
                categories.other.push({ hash, prefix: null, message });
            }
        }
    });

    return categories;
}

//
// Update CHANGELOG.md file (used by npm version hook)
//
gulp.task('changelog-file', (cb) => {
    try {
        const pkg = require('./package.json');
        const newVersion = pkg.version;

        // Get the latest tag (before the new one)
        const latestTag = execSync('git tag --sort=-v:refname | head -n1').toString().trim();

        if (!latestTag) {
            console.log('No previous tags found, skipping changelog update');
            cb();
            return;
        }

        const categories = categorizeCommits(latestTag);

        if (!categories) {
            console.log(`No new commits since ${latestTag}`);
            cb();
            return;
        }

        // Combine all commits in order: breaking, features, bugfixes, tasks, other
        const allCommits = [
            ...categories.breaking,
            ...categories.features,
            ...categories.bugfixes,
            ...categories.tasks,
            ...categories.other
        ];

        // Output preview to console
        console.log('\n' + '='.repeat(60));
        console.log(`Adding to CHANGELOG.md for version ${newVersion}`);
        console.log('='.repeat(60) + '\n');

        allCommits.forEach(item => {
            if (item.prefix) {
                console.log(`${item.hash} [${item.prefix}] ${item.message}`);
            } else {
                console.log(`${item.hash} ${item.message}`);
            }
        });

        console.log('\n' + '='.repeat(60) + '\n');

        // Build the new changelog entry
        const date = new Date().toISOString().split('T')[0];
        let entry = `## [${newVersion}] - ${date}\n\n`;

        allCommits.forEach(item => {
            if (item.prefix) {
                entry += `${item.hash} [${item.prefix}] ${item.message}\n`;
            } else {
                entry += `${item.hash} ${item.message}\n`;
            }
        });

        entry += '\n';

        // Read existing CHANGELOG.md or create new one
        let changelog = '';
        const changelogPath = './CHANGELOG.md';

        if (fs.existsSync(changelogPath)) {
            changelog = fs.readFileSync(changelogPath, 'utf8');

            // Insert new entry after the header
            const lines = changelog.split('\n');
            const headerEndIndex = lines.findIndex((line, i) => i > 0 && line.startsWith('##'));

            if (headerEndIndex !== -1) {
                lines.splice(headerEndIndex, 0, entry);
                changelog = lines.join('\n');
            } else {
                changelog = changelog + '\n' + entry;
            }
        } else {
            // Create new changelog with header
            changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).\n\n${entry}`;
        }

        // Write the updated changelog
        fs.writeFileSync(changelogPath, changelog);
        console.log(`✓ Updated CHANGELOG.md for version ${newVersion}`);

        cb();
    } catch (error) {
        console.error('Error updating changelog:', error.message);
        cb(error);
    }
});

/**
 * Docs
 */
gulp.task('site-clean', () => {
    // fs.rm rather than del: the site is eight hundred files in nested folders,
    // and removing them in parallel now and then reaches the rmdir before the
    // last unlink under it has landed, which surfaces as ENOTEMPTY and fails
    // the build for no reason. maxRetries is the flag that exists for it.
    return fs.promises.rm(options.site, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
    });
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

    // Copy the Soul design system. Nearly the whole dist is needed: soul.css
    // references the fonts relatively and the elements resolve their sprites
    // next to soul.js — which is `assets/icons/sprites/`, the one thing under
    // assets this site asks for.
    //
    // `assets/icons/svgs/` is left behind: 392 single files and 1.6MB, published
    // for consumers who want one glyph as a file, and nothing here links to any
    // of them. It arrived with the move from git to the registry, where the two
    // pack differently — worth stating, because a copy this broad is otherwise
    // a directory that grows the published site whenever the package grows.
    tasks.push(new Promise((resolve, reject) => {
        gulp.src([
                path.join(options.soul, '**/*'),
                '!' + path.join(options.soul, 'assets/icons/svgs/**'),
            ], { base: options.soul, encoding: false })
            .pipe(gulp.dest(path.join(options.site, 'soul')))
            .on('end', resolve)
            .on('error', reject);
    }));

    // Wait for asset copying to complete before processing templates
    Promise.all(tasks).then(() => {
        // gulp-twig and Twig.js share one global template registry. Keeping it
        // enabled makes parallel inheritance deterministic, but a watch build
        // must not reuse templates compiled before the latest file change.
        twigEngine.extend((Twig) => {
            Twig.Templates.registry = {};
        });

        let templateTasks = [];

        // Fetch generated data
        let typo3 = JSON.parse(fs.readFileSync('./typo3.json', 'utf8'))
        let categories = getCategories();
        let data = JSON.parse(fs.readFileSync(options.dist + 'icons.json', 'utf8'));
        let icons = data.icons;
        // How many icons are drawn on which grid. Counted rather than stated:
        // most of the set is 16, but an overlay is 11 and a module is 64, and a
        // page that claims one number for all of them is wrong the moment
        // somebody adds an icon.
        let grids = {};

        for (let iconKey in icons) {
            const iconContent = fs.readFileSync(path.join(options.dist, icons[iconKey].svg), 'utf8');
            icons[iconKey]._meta = getMetaData(icons[iconKey].identifier, icons[iconKey].category);
            icons[iconKey]._inline = iconContent
            icons[iconKey]._inlineEscaped = escapeSvg(iconContent)
            const viewBox = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) /.exec(iconContent);
            const grid = viewBox ? viewBox[1] : 'unknown';
            grids[grid] = (grids[grid] ?? 0) + 1;
        }

        const cacheBuster = Date.now();

        // The year the footer's notice carries. Read at build time rather than
        // written into the template, where it would quietly be wrong from every
        // January until somebody noticed.
        const year = new Date().getFullYear();

        const iconCount = Object.keys(icons).length;

        // The search indexes. A rendered site has no server, so finding
        // something is a small JSON the build writes and a field fetches on the
        // first keystroke. Every url is relative to the index file itself,
        // which is why both of these sit in the root.
        //
        // Two of them, because the two fields are asked different questions.
        // The bar is on every page and searches the site; the field on the home
        // page is where somebody arrives looking for a mark, and a category or
        // a guide page among the hits is an answer to a question they did not
        // ask. Same entries, built once.
        //
        // The text is what a reader would search by but cannot see in the
        // title: the category an icon is in, its tags, and the names it used to
        // have. The image is the mark itself — an SVG counts as a drawing to
        // the search result, so it lands on the fixed art ground and stays
        // legible in either mode.
        const iconEntries = [];
        const categoryEntries = [];
        categories.forEach((category) => {
            categoryEntries.push({
                title: category.title,
                url: 'icons/' + category.identifier + '.html',
                text: category.description + ' ' + category.count + ' icons.',
            });
            category.icons.forEach((identifier) => {
                let icon = icons[identifier];
                iconEntries.push({
                    title: identifier,
                    url: 'icons/' + category.identifier + '/' + identifier + '.html',
                    // Category, then why it matched. Grouped rather than run
                    // together: this line is read as well as searched, and
                    // "Actions actions-insert-record" reads as one phrase.
                    text: [
                        category.title,
                        icon._meta.tags.join(', '),
                        icon._meta.alias.join(', '),
                    ].filter((part) => part.length > 0).join(' · '),
                    image: 'dist/' + icon.svg,
                });
            });
        });

        const pageEntries = [
            { title: 'TYPO3 Icons', url: 'index.html', text: pkg.description },
            { title: 'All icons', url: 'icons.html', text: 'Every icon in the set, filtered by name or tag.' },
            { title: 'Guide', url: 'guide.html', text: 'How the set is built. Sizes, the size scale, and the colour palette.' },
            { title: 'Icon usage', url: 'guide/usage.html', text: 'Choose between installation, TYPO3 backend usage and external usage.' },
            { title: 'Installation', url: 'guide/installation.html', text: 'Use the icon library included in TYPO3 Core or install the npm package and inspect its published assets.' },
            { title: 'Backend usage', url: 'guide/backend-usage.html', text: 'Use TYPO3 icons in Fluid templates and backend JavaScript with the ViewHelper or web component.' },
            { title: 'External usage', url: 'guide/external-usage.html', text: 'Use TYPO3 icons outside the backend with SVG sprites, CSS and Sass.' },
            { title: 'Version compatibility', url: 'guide/compatibility.html', text: 'Map TYPO3 branches to their tested @typo3/icons package versions.' },
            { title: 'Drawing an icon', url: 'guide/drawing.html', text: 'Construction rules for action icons and overlay icons. Protective space, outline width, smooth edges, 16 and 11 pixels.' },
            { title: 'Module icons', url: 'guide/modules.html', text: 'The 64 pixel canvas of the module menu. Scaling, stroke width, corner radius, currentColor and the accent colour.' },
            { title: 'Bidirectional support', url: 'guide/bidi.html', text: 'BiDi. Logical and physical icons, start and end, RTL, Arabic, Hebrew, the icon-bidi class.' },
            { title: 'Contributing', url: 'guide/contributing.html', text: 'Choose the right contribution path and prepare a focused pull request for TYPO3 Icons.' },
            { title: 'Contributing icon changes', url: 'guide/contributing-icons.html', text: 'Prepare source SVGs, metadata, generated assets and visual evidence for an icon contribution.' },
            { title: 'Development setup', url: 'guide/contributing-development.html', text: 'Install dependencies, understand source boundaries, build icons and preview the documentation site.' },
            { title: 'Release process', url: 'guide/contributing-releases.html', text: 'Maintainer workflow for versioning, changelog generation, Git tags and npm publication.' },
        ];

        fs.writeFileSync(
            path.join(options.site, 'search.json'),
            JSON.stringify([...pageEntries, ...categoryEntries, ...iconEntries]),
            'utf8'
        );
        fs.writeFileSync(
            path.join(options.site, 'search-icons.json'),
            JSON.stringify(iconEntries),
            'utf8'
        );

        // The pool the home page draws its opening marks from, by category, so
        // the wall it builds shows the range of the set rather than one corner
        // of it. Its own file rather than one of the indexes above: this is
        // fetched on every visit to the front page, and icons.json is 200kB of
        // paths the wall has no use for. The identifier and its category are
        // all a tile needs — the sprite reference is built from them.
        //
        // Which categories may appear is `options.showcase`.
        const showcasePool = {};
        categories
            .filter((category) => options.showcase.includes(category.identifier))
            .forEach((category) => {
                showcasePool[category.identifier] = category.icons;
            });

        fs.writeFileSync(
            path.join(options.site, 'showcase.json'),
            JSON.stringify(showcasePool),
            'utf8'
        );

        // Home
        templateTasks.push(() => new Promise((resolve, reject) => {
            gulp.src('./tmpl/html/docs/home.html.twig')
                .pipe(twig({
                    cache: true,
                    data: {
                        pkg: pkg,
                        typo3: typo3,
                        icons: icons,
                        iconCount: iconCount,
                        category: {},
                        categories: categories,
                        rendering: {},
                        pathPrefix: '',
                        page: 'home',
                        nav: buildNav(categories, '', 'home'),
                        cacheBuster: cacheBuster,
                        year: year,
                    }
                }))
                .pipe(rename('index.html'))
                .pipe(gulp.dest(path.join(options.site)))
                .on('end', resolve)
                .on('error', reject);
        }));

        // All icons
        templateTasks.push(() => new Promise((resolve, reject) => {
            gulp.src('./tmpl/html/docs/index.html.twig')
                .pipe(twig({
                    cache: true,
                    data: {
                        pkg: pkg,
                        typo3: typo3,
                        icons: icons,
                        iconCount: iconCount,
                        category: {},
                        categories: categories,
                        rendering: {},
                        pathPrefix: '',
                        page: 'icons',
                        nav: buildNav(categories, '', 'icons'),
                        cacheBuster: cacheBuster,
                        year: year,
                    }
                }))
                .pipe(rename('icons.html'))
                .pipe(gulp.dest(path.join(options.site)))
                .on('end', resolve)
                .on('error', reject);
        }));

        // Guide
        templateTasks.push(() => new Promise((resolve, reject) => {
            gulp.src('./tmpl/html/docs/guide.html.twig')
                .pipe(twig({
                    cache: true,
                    data: {
                        pkg: pkg,
                        typo3: typo3,
                        icons: icons,
                        category: {},
                        categories: categories,
                        rendering: {},
                        pathPrefix: '',
                        page: 'guide',
                        nav: buildNav(categories, '', 'guide'),
                        cacheBuster: cacheBuster,
                        year: year,
                    }
                }))
                .pipe(rename('guide.html'))
                .pipe(gulp.dest(path.join(options.site)))
                .on('end', resolve)
                .on('error', reject);
        }));

        // Guide pages. Flat templates, nested output: the overview keeps the
        // address it has always had and the rest sit under it.
        [
            { template: 'guide-usage', file: 'usage.html' },
            { template: 'guide-installation', file: 'installation.html' },
            { template: 'guide-backend-usage', file: 'backend-usage.html' },
            { template: 'guide-external-usage', file: 'external-usage.html' },
            { template: 'guide-compatibility', file: 'compatibility.html' },
            { template: 'guide-drawing', file: 'drawing.html' },
            { template: 'guide-modules', file: 'modules.html' },
            { template: 'guide-bidi', file: 'bidi.html' },
            { template: 'guide-contributing', file: 'contributing.html' },
            { template: 'guide-contributing-icons', file: 'contributing-icons.html' },
            { template: 'guide-contributing-development', file: 'contributing-development.html' },
            { template: 'guide-contributing-releases', file: 'contributing-releases.html' },
        ].forEach((guidePage) => {
            templateTasks.push(() => new Promise((resolve, reject) => {
                gulp.src('./tmpl/html/docs/' + guidePage.template + '.html.twig')
                    .pipe(twig({
                        cache: true,
                        data: {
                            pkg: pkg,
                            typo3: typo3,
                            icons: icons,
                            iconCount: iconCount,
                            grids: grids,
                            category: {},
                            categories: categories,
                            rendering: {},
                            pathPrefix: '../',
                            page: guidePage.template,
                            nav: buildNav(categories, '../', guidePage.template),
                            cacheBuster: cacheBuster,
                            year: year,
                        }
                    }))
                    .pipe(rename(guidePage.file))
                    .pipe(gulp.dest(path.join(options.site, 'guide')))
                    .on('end', resolve)
                    .on('error', reject);
            }));
        });

        // llms.txt and its long form, the convention of llmstxt.org: a plain
        // markdown summary of the site at a known address, for the readers
        // that arrive without a browser. Templates rather than strings here,
        // because the prose belongs next to the prose of the other pages, and
        // generated rather than committed, because the icon count, the
        // categories and the version table are facts of this build.
        [
            { template: 'llms.txt', file: 'llms.txt' },
            { template: 'llms-full.txt', file: 'llms-full.txt' },
        ].forEach((textPage) => {
            templateTasks.push(() => new Promise((resolve, reject) => {
                gulp.src('./tmpl/text/docs/' + textPage.template + '.twig')
                    .pipe(twig({
                        cache: true,
                        data: {
                            pkg: pkg,
                            typo3: typo3,
                            icons: icons,
                            iconCount: iconCount,
                            grids: grids,
                            categories: categories,
                            // The same list the search index is built from, so
                            // a page added to the guide reaches both readers.
                            pages: pageEntries,
                            siteUrl: options.siteUrl,
                        }
                    }))
                    .pipe(rename(textPage.file))
                    .pipe(gulp.dest(path.join(options.site)))
                    .on('end', resolve)
                    .on('error', reject);
            }));
        });

        // Build pages
        for (let categoryKey in categories) {
            let category = categories[categoryKey];
            templateTasks.push(() => new Promise((resolve, reject) => {
                gulp.src('./tmpl/html/docs/section.html.twig')
                    .pipe(twig({
                        cache: true,
                        data: {
                            pkg: pkg,
                            typo3: typo3,
                            icons: icons,
                            category: category,
                            categories: categories,
                            pathPrefix: '../',
                            page: 'section',
                            nav: buildNav(categories, '../', 'section', category.identifier),
                            cacheBuster: cacheBuster,
                            year: year,
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
                templateTasks.push(() => new Promise((resolve, reject) => {
                    gulp.src('./tmpl/html/docs/single.html.twig')
                        .pipe(twig({
                            cache: true,
                            data: {
                                pkg: pkg,
                                typo3: typo3,
                                icon: icon,
                                icons: icons,
                                category: category,
                                categories: categories,
                                pathPrefix: '../../',
                                page: 'single',
                                nav: buildNav(categories, '../../', 'single', category.identifier),
                                cacheBuster: cacheBuster,
                                year: year,
                            }
                        }))
                        .pipe(rename(iconIdentifier + '.html'))
                        .pipe(gulp.dest(path.join(options.site, 'icons', category.identifier)))
                        .on('end', resolve)
                        .on('error', reject);
                }));
            }
        }

        (async () => {
            for (let renderTemplate of templateTasks) {
                await renderTemplate();
            }
            cb();
        })().catch(cb);
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
