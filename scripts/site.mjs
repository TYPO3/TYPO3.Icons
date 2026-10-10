// The documentation site: _site/, built from tmpl/, assets/ and dist/.
import fs from 'node:fs';
import path from 'node:path';
import Twig from 'twig';
import { options } from './lib/options.mjs';
import { buildNav, escapeSvg, getCategories, getMetaData } from './lib/data.mjs';
import { compileCss } from './icons.mjs';

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

    const site = (...parts) => path.join(options.site, ...parts);
    const docs = (name) => './tmpl/html/docs/' + name + '.html.twig';

    render(docs('home'), {
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
    }, site('index.html'));

    render(docs('index'), {
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
    }, site('icons.html'));

    render(docs('guide'), {
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
    }, site('guide.html'));

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
        render(docs(guidePage.template), {
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
        }, site('guide', guidePage.file));
    });

    // llms.txt and its long form, the convention of llmstxt.org: a plain
    // markdown summary of the site at a known address, for the readers
    // that arrive without a browser. Templates rather than strings here,
    // because the prose belongs next to the prose of the other pages, and
    // generated rather than committed, because the icon count, the
    // categories and the version table are facts of this build.
    ['llms.txt', 'llms-full.txt'].forEach((file) => {
        render('./tmpl/text/docs/' + file + '.twig', {
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
        }, site(file));
    });

    for (let category of categories) {
        render(docs('section'), {
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
        }, site('icons', category.identifier + '.html'));

        for (let iconIdentifier of category.icons) {
            render(docs('single'), {
                pkg: pkg,
                typo3: typo3,
                icon: icons[iconIdentifier],
                icons: icons,
                category: category,
                categories: categories,
                pathPrefix: '../../',
                page: 'single',
                nav: buildNav(categories, '../../', 'single', category.identifier),
                cacheBuster: cacheBuster,
                year: year,
            }, site('icons', category.identifier, iconIdentifier + '.html'));
        }
    }
}

export async function site() {
    await siteClean();
    await siteBuild();
}
