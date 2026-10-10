// The facts the icon build and the site build share: the categories, the
// metadata of every icon and the navigation every page carries.
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import merge from 'deepmerge';
import { options } from './options.mjs';

export function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function (file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}

export function getIcons(dir) {
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

export function getMetaFiles(dir) {
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

export function getCategories() {
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
export function buildNav(categories, pathPrefix, page, currentCategory) {
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

export function getMetaDataFileName(identifier, folder) {
    return path.join(options.meta, folder, identifier + '.yaml' );
}

export function getMetaData(identifier, folder) {
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

export function updateMetaData(identifier, folder, metadata) {
    let metafile = getMetaDataFileName(identifier, folder);
    if (!fs.existsSync(path.dirname(metafile))){
        fs.mkdirSync(path.dirname(metafile));
    }
    fs.writeFileSync(metafile, yaml.dump(metadata), 'utf8');
}

export function getData() {
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

export function escapeSvg(svg) {
    const charReplacementMap = {
        '"': '\'',
        '#': '%23',
        '<': '%3c',
        '>': '%3e'
    };
    const regex = new RegExp('[' + Object.keys(charReplacementMap).join('') + ']', 'g');
    return svg.replace(regex, c => charReplacementMap[c]);
}
