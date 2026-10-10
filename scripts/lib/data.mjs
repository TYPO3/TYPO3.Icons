// The facts every task shares: the categories, the icons with their metadata,
// and the navigation every page of the site carries.
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import merge from 'deepmerge';
import { options } from './options.mjs';
import { categories as categoryConfig } from './categories.mjs';
import { pages, sections } from './pages.mjs';

export function getFolders(dir) {
    return fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
}

export function getIcons(dir) {
    return fs.readdirSync(dir).filter((file) => path.extname(file) === '.svg');
}

export function getMetaFiles(dir) {
    return fs.readdirSync(dir).filter((file) => path.extname(file) === '.yaml');
}

export function getCategories() {
    return getFolders(options.src).map((category) => {
        const config = categoryConfig[category] ?? {};
        const icons = getIcons(path.join(options.dist_svgs, category)).map((icon) => path.basename(icon, '.svg'));
        return {
            identifier: category,
            title: config.title ?? category.charAt(0).toUpperCase() + category.slice(1),
            description: config.description ?? '',
            minor: config.minor ?? false,
            sprite: 'sprites/' + category + '.svg',
            rendering: config.rendering ?? {},
            icons: icons,
            count: icons.length,
        };
    });
}

export function getMetaDataFileName(identifier, folder) {
    return path.join(options.meta, folder, identifier + '.yaml');
}

export function getMetaData(identifier, folder) {
    const defaultmeta = { alias: [], changes: [], tags: [] };
    const metafile = getMetaDataFileName(identifier, folder);
    const metadata = fs.existsSync(metafile) ? yaml.load(fs.readFileSync(metafile, 'utf8')) : {};
    return merge.all([defaultmeta, metadata]);
}

export function updateMetaData(identifier, folder, metadata) {
    const metafile = getMetaDataFileName(identifier, folder);
    fs.mkdirSync(path.dirname(metafile), { recursive: true });
    fs.writeFileSync(metafile, yaml.dump(metadata), 'utf8');
}

// Every built icon with its metadata, read once. The package data, the Sass
// variables and the site are all views of this.
export function loadIcons() {
    const icons = {};
    for (const folder of getFolders(options.dist_svgs)) {
        for (const file of getIcons(path.join(options.dist_svgs, folder))) {
            const identifier = path.basename(file, '.svg');
            const meta = getMetaData(identifier, folder);
            icons[identifier] = {
                identifier: identifier,
                category: folder,
                svg: 'svgs/' + folder + '/' + identifier + '.svg',
                sprite: 'sprites/' + folder + '.svg' + '#' + identifier,
                bidi: meta.bidi ? true : false,
                meta: meta,
            };
        }
    }
    return icons;
}

// What dist/icons.json publishes: every icon without its metadata, and the old
// identifiers that still resolve to it.
export function getData(icons = loadIcons()) {
    const data = { icons: {}, aliases: {} };
    for (const { meta, ...icon } of Object.values(icons)) {
        for (const alias of meta.alias) {
            data.aliases[alias] = icon.identifier;
        }
        data.icons[icon.identifier] = icon;
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

/**
 * The navigation every page shares, as one tree: the bar reads it as sections,
 * the rail as the pages of the section the reader is in. Built here rather than
 * in Twig because both layouts need the same tree and a template cannot hand
 * one back. The sections and their pages come from pages.mjs.
 */
export function buildNav(categories, pathPrefix, page, currentCategory) {
    const inSection = page === 'section' || page === 'single';
    const byPage = Object.fromEntries(pages.map((entry) => [entry.page, entry]));

    const entryOf = (category) => ({
        label: category.title,
        href: pathPrefix + 'icons/' + category.identifier + '.html',
        current: inSection && category.identifier === currentCategory,
    });
    const icons = {
        label: 'Icons',
        href: pathPrefix + 'icons.html',
        front: true,
        current: page === 'icons',
        here: inSection,
        items: [
            ...categories.filter((category) => !category.minor).map(entryOf),
            ...categories.filter((category) => category.minor).map(entryOf),
        ],
    };
    const sectionOf = (section) => ({
        label: section.label,
        href: pathPrefix + byPage[section.page].file,
        front: true,
        current: page === section.page,
        here: section.items.filter((item) => item !== section.page).includes(page),
        items: section.items.map((item) => ({
            label: byPage[item].nav,
            href: pathPrefix + byPage[item].file,
            current: page === item,
        })),
    });

    // One canonical tree feeds every navigation surface. The bar receives the
    // whole tree; the rail receives the active branch from that same array.
    // No second list of labels or links exists to drift out of sync.
    const all = [icons, ...sections.map(sectionOf)];
    const tree = { label: 'TYPO3 Icons', items: all };
    const section = all.find((entry) => entry.current || entry.here) ?? icons;

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
    const trailOf = (entries) => {
        for (const entry of entries) {
            if (entry.current) {
                return [{ label: entry.label, href: entry.href }];
            }
            if (entry.here && entry.items) {
                const below = trailOf(entry.items);
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
        trail: [{ label: tree.label, href: pathPrefix + 'index.html' }, ...trailOf(all)],
    };
}
