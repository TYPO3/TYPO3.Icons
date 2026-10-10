// Every page of the site that is not a category or an icon, once: where it is
// written, the name the navigation gives it, and the entry the search finds it
// by. The navigation, the search index, llms.txt and the render loop all read
// this list, so a page added here reaches every one of them. Written out on
// each of them instead, the names had drifted apart.
//
// `nav` is the name in a section's list of pages. A page without one is only
// reached as the head of its section, or from the bar. The search title may
// say more than the navigation, which reads inside its section.
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export const pages = [
    {
        page: 'home',
        file: 'index.html',
        search: { title: 'TYPO3 Icons', text: pkg.description },
    },
    {
        page: 'icons',
        template: 'index',
        file: 'icons.html',
        search: { title: 'All icons', text: 'Every icon in the set, filtered by name or tag.' },
    },
    {
        page: 'guide',
        file: 'guide.html',
        nav: 'Design foundations',
        search: { title: 'Guide', text: 'How the set is built. Sizes, the size scale, and the colour palette.' },
    },
    {
        page: 'guide-usage',
        file: 'guide/usage.html',
        search: { title: 'Icon usage', text: 'Choose between installation, TYPO3 backend usage and external usage.' },
    },
    {
        page: 'guide-installation',
        file: 'guide/installation.html',
        nav: 'Installation',
        search: { title: 'Installation', text: 'Use the icon library included in TYPO3 Core or install the npm package and inspect its published assets.' },
    },
    {
        page: 'guide-backend-usage',
        file: 'guide/backend-usage.html',
        nav: 'Backend usage',
        search: { title: 'Backend usage', text: 'Use TYPO3 icons in Fluid templates and backend JavaScript with the ViewHelper or web component.' },
    },
    {
        page: 'guide-external-usage',
        file: 'guide/external-usage.html',
        nav: 'External usage',
        search: { title: 'External usage', text: 'Use TYPO3 icons outside the backend with SVG sprites, CSS and Sass.' },
    },
    {
        page: 'guide-compatibility',
        file: 'guide/compatibility.html',
        nav: 'Version compatibility',
        search: { title: 'Version compatibility', text: 'Map TYPO3 branches to their tested @typo3/icons package versions.' },
    },
    {
        page: 'guide-drawing',
        file: 'guide/drawing.html',
        nav: 'Drawing an icon',
        search: { title: 'Drawing an icon', text: 'Construction rules for action icons and overlay icons. Protective space, outline width, smooth edges, 16 and 11 pixels.' },
    },
    {
        page: 'guide-modules',
        file: 'guide/modules.html',
        nav: 'Module icons',
        search: { title: 'Module icons', text: 'The 64 pixel canvas of the module menu. Scaling, stroke width, corner radius, currentColor and the accent colour.' },
    },
    {
        page: 'guide-bidi',
        file: 'guide/bidi.html',
        nav: 'Bidirectional support',
        search: { title: 'Bidirectional support', text: 'BiDi. Logical and physical icons, start and end, RTL, Arabic, Hebrew, the icon-bidi class.' },
    },
    {
        page: 'guide-contributing',
        file: 'guide/contributing.html',
        nav: 'Overview',
        search: { title: 'Contributing', text: 'Choose the right contribution path and prepare a focused pull request for TYPO3 Icons.' },
    },
    {
        page: 'guide-contributing-icons',
        file: 'guide/contributing-icons.html',
        nav: 'Icon changes',
        search: { title: 'Contributing icon changes', text: 'Prepare source SVGs, metadata, generated assets and visual evidence for an icon contribution.' },
    },
    {
        page: 'guide-contributing-development',
        file: 'guide/contributing-development.html',
        nav: 'Development setup',
        search: { title: 'Development setup', text: 'Install dependencies, understand source boundaries, build icons and preview the documentation site.' },
    },
    {
        page: 'guide-contributing-releases',
        file: 'guide/contributing-releases.html',
        nav: 'Release process',
        search: { title: 'Release process', text: 'Maintainer workflow for versioning, changelog generation, Git tags and npm publication.' },
    },
];

// The sections of the bar after Icons, which lists the categories. A section
// opens on its head page; its items are the pages its rail lists, and the
// head is among them where the rail names it, as an overview.
export const sections = [
    {
        label: 'Usage',
        page: 'guide-usage',
        items: ['guide-installation', 'guide-backend-usage', 'guide-external-usage', 'guide-compatibility'],
    },
    {
        label: 'Design guidelines',
        page: 'guide',
        items: ['guide', 'guide-drawing', 'guide-modules', 'guide-bidi'],
    },
    {
        label: 'Contribute',
        page: 'guide-contributing',
        items: ['guide-contributing', 'guide-contributing-icons', 'guide-contributing-development', 'guide-contributing-releases'],
    },
];
