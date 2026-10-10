// The documentation site: _site/, built from tmpl/, assets/ and dist/.
import fs from 'node:fs';
import path from 'node:path';
import Twig from 'twig';
import { options } from './lib/options.mjs';
import { buildNav, escapeSvg, getCategories, loadIcons } from './lib/data.mjs';
import { compileCss } from './lib/css.mjs';
import { showcase } from './lib/categories.mjs';
import { pages } from './lib/pages.mjs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// A code sample written into a template carries the template's indentation.
// The first line of a Twig string literal begins right after the opening quote
// and so has none, while every line under it is indented to wherever the call
// sits — which is why `|trim` cannot fix it: it only touches the two ends of
// the whole string, and the damage is at the start of every line but the first.
//
// So the common indent of the lines after the first comes off, and only that.
// A snippet that nests — an SVG, a Lit template — keeps its own structure,
// because what is removed is what every one of its lines shares.
Twig.extendFilter('dedent', (value) => {
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

// Copies a folder, keeping what `keep` lets through. Byte for byte: a font or
// an icon file is not text, and reading it as text damages it.
async function copyTree(from, to, keep = () => true) {
    await fs.promises.mkdir(to, { recursive: true });
    for (const entry of await fs.promises.readdir(from, { withFileTypes: true })) {
        const source = path.join(from, entry.name);
        const target = path.join(to, entry.name);
        if (!keep(source, entry.isDirectory())) {
            continue;
        }
        if (entry.isDirectory()) {
            await copyTree(source, target, keep);
        } else {
            await fs.promises.copyFile(source, target);
        }
    }
}

function render(template, data, target) {
    const html = Twig.twig({ path: path.resolve(template), async: false }).render(data);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
}

export async function siteClean() {
    // fs.rm with retries: the site is eight hundred files in nested folders,
    // and removing them in parallel now and then reaches the rmdir before the
    // last unlink under it has landed, which surfaces as ENOTEMPTY and fails
    // the build for no reason. maxRetries is the flag that exists for it.
    await fs.promises.rm(options.site, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
    });
}

export async function siteBuild() {
    await Promise.all([
        compileCss(path.join(options.assets, 'scss/docs.scss')).then(async (css) => {
            await fs.promises.mkdir(path.join(options.site, 'assets', 'css'), { recursive: true });
            await fs.promises.writeFile(path.join(options.site, 'assets', 'css', 'docs.css'), css);
        }),
        // The static assets, without the stylesheets they are compiled from.
        copyTree(options.assets, path.join(options.site, 'assets'), (file, isDirectory) => isDirectory || !file.endsWith('.scss')),
        copyTree(options.dist, path.join(options.site, 'dist')),
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
        copyTree(options.soul, path.join(options.site, 'soul'), (file) => path.relative(options.soul, file) !== path.join('assets', 'icons', 'svgs')),
    ]);

    // Twig.js keeps one global template registry. Keeping it makes inheritance
    // deterministic, but a watch build must not reuse templates compiled before
    // the latest file change.
    Twig.extend((T) => {
        T.Templates.registry = {};
    });

    const typo3 = JSON.parse(fs.readFileSync('./typo3.json', 'utf8'));
    const categories = getCategories();
    // How many icons are drawn on which grid. Counted rather than stated:
    // most of the set is 16, but an overlay is 11 and a module is 64, and a
    // page that claims one number for all of them is wrong the moment
    // somebody adds an icon.
    const grids = {};
    const icons = {};
    for (const { meta, ...icon } of Object.values(loadIcons())) {
        const iconContent = fs.readFileSync(path.join(options.dist, icon.svg), 'utf8');
        icons[icon.identifier] = { ...icon, _meta: meta, _inline: iconContent, _inlineEscaped: escapeSvg(iconContent) };
        const viewBox = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) /.exec(iconContent);
        const grid = viewBox ? viewBox[1] : 'unknown';
        grids[grid] = (grids[grid] ?? 0) + 1;
    }
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
    const pageEntries = pages.map((entry) => ({ title: entry.search.title, url: entry.file, text: entry.search.text }));
    const categoryEntries = categories.map((category) => ({
        title: category.title,
        url: 'icons/' + category.identifier + '.html',
        text: category.description + ' ' + category.count + ' icons.',
    }));
    const iconEntries = categories.flatMap((category) => category.icons.map((identifier) => ({
        title: identifier,
        url: 'icons/' + category.identifier + '/' + identifier + '.html',
        // Category, then why it matched. Grouped rather than run
        // together: this line is read as well as searched, and
        // "Actions actions-insert-record" reads as one phrase.
        text: [
            category.title,
            icons[identifier]._meta.tags.join(', '),
            icons[identifier]._meta.alias.join(', '),
        ].filter((part) => part.length > 0).join(' · '),
        image: 'dist/' + icons[identifier].svg,
    })));
    fs.writeFileSync(path.join(options.site, 'search.json'), JSON.stringify([...pageEntries, ...categoryEntries, ...iconEntries]), 'utf8');
    fs.writeFileSync(path.join(options.site, 'search-icons.json'), JSON.stringify(iconEntries), 'utf8');

    // The pool the home page draws its opening marks from, by category, so
    // the wall it builds shows the range of the set rather than one corner
    // of it. Its own file rather than one of the indexes above: this is
    // fetched on every visit to the front page, and icons.json is 200kB of
    // paths the wall has no use for. The identifier and its category are
    // all a tile needs — the sprite reference is built from them.
    //
    // Which categories may appear is `showcase` in categories.mjs.
    const showcasePool = Object.fromEntries(categories
        .filter((category) => showcase.includes(category.identifier))
        .map((category) => [category.identifier, category.icons]));
    fs.writeFileSync(path.join(options.site, 'showcase.json'), JSON.stringify(showcasePool), 'utf8');

    // What every page renders with. A page adds where it stands and, on a
    // category or an icon page, which category or icon it shows.
    const context = {
        pkg: pkg,
        typo3: typo3,
        icons: icons,
        iconCount: iconCount,
        grids: grids,
        categories: categories,
        category: {},
        rendering: {},
        cacheBuster: Date.now(),
        // The year the footer's notice carries. Read at build time rather than
        // written into the template, where it would quietly be wrong from every
        // January until somebody noticed.
        year: new Date().getFullYear(),
    };
    const at = (file, page, currentCategory) => {
        const pathPrefix = '../'.repeat(file.split('/').length - 1);
        return { pathPrefix: pathPrefix, page: page, nav: buildNav(categories, pathPrefix, page, currentCategory) };
    };
    const docs = (name) => './tmpl/html/docs/' + name + '.html.twig';

    for (const entry of pages) {
        render(docs(entry.template ?? entry.page), { ...context, ...at(entry.file, entry.page) }, path.join(options.site, entry.file));
    }

    // llms.txt and its long form, the convention of llmstxt.org: a plain
    // markdown summary of the site at a known address, for the readers
    // that arrive without a browser. Templates rather than strings here,
    // because the prose belongs next to the prose of the other pages, and
    // generated rather than committed, because the icon count, the
    // categories and the version table are facts of this build.
    for (const file of ['llms.txt', 'llms-full.txt']) {
        render('./tmpl/text/docs/' + file + '.twig', {
            ...context,
            // The same list the search index is built from, so
            // a page added to the guide reaches both readers.
            pages: pageEntries,
            siteUrl: options.siteUrl,
        }, path.join(options.site, file));
    }

    for (const category of categories) {
        const file = 'icons/' + category.identifier + '.html';
        render(docs('section'), { ...context, category: category, ...at(file, 'section', category.identifier) }, path.join(options.site, file));
        for (const identifier of category.icons) {
            const file = 'icons/' + category.identifier + '/' + identifier + '.html';
            render(docs('single'), { ...context, category: category, icon: icons[identifier], ...at(file, 'single', category.identifier) }, path.join(options.site, file));
        }
    }
}

export async function site() {
    await siteClean();
    await siteBuild();
}
