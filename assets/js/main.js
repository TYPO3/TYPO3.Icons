// The wall of marks the front page opens with, redrawn on every visit.
//
// The six in the markup are the wall a reader arrives at; these six are the ones
// they end up looking at, one from each of six categories so the wall shows the
// range of the set rather than one corner of it. A tile is rewritten rather than
// rebuilt: the markup already says what a tile is, and a second copy of that
// shape in here is one that would have to be kept in step with the template.
//
// Nothing announces itself if the fetch fails or the file is not there. The wall
// is already standing, and six chosen marks are no worse than six other ones.
async function drawShowcase(list) {
    let tiles = Array.from(list.querySelectorAll('.homegrid-item'));
    if (!tiles.length) {
        return;
    }

    let response = await fetch('showcase.json');
    if (!response.ok) {
        return;
    }
    let pool = await response.json();

    // Fisher-Yates, so every order is as likely as every other.
    // `sort(() => Math.random() - 0.5)` is the shorter thing that looks like
    // this and is not: the comparator is inconsistent, so what comes out
    // depends on the sort's implementation.
    let shuffle = (items) => {
        let shuffled = items.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    let categories = shuffle(Object.keys(pool).filter((name) => pool[name].length));
    if (!categories.length) {
        return;
    }

    // Fewer categories than tiles is a narrowed list, not a failure: the wall
    // goes round them again rather than staying on the six the markup shipped,
    // which would read as the setting having done nothing. `taken` is what keeps
    // the same mark off the wall twice once a category comes round a second time.
    let taken = new Set();

    for (let [index, tile] of tiles.entries()) {
        let category = categories[index % categories.length];
        let choices = pool[category].filter((identifier) => !taken.has(identifier));
        if (!choices.length) {
            continue;
        }
        let identifier = choices[Math.floor(Math.random() * choices.length)];
        taken.add(identifier);
        let use = tile.querySelector('use');
        if (!use) {
            continue;
        }

        // The sprite reference the build wrote, with its cache buster kept: the
        // query is the build's to decide and this only swaps which sprite and
        // which symbol inside it.
        let current = use.getAttribute('xlink:href') ?? use.getAttribute('href') ?? '';
        let version = current.includes('?') ? current.slice(current.indexOf('?'), current.indexOf('#')) : '';
        let reference = 'dist/sprites/' + category + '.svg' + version + '#' + identifier;

        tile.href = 'icons/' + category + '/' + identifier + '.html';
        tile.setAttribute('aria-label', identifier);
        tile.setAttribute('title', identifier);
        use.setAttribute('xlink:href', reference);
        use.setAttribute('href', reference);
    }
}

// Inplace Search and BiDi Filter
//
// The controls are Soul elements: `sds-field` says what was typed with
// `sds-input`, `sds-checkbox` says what was ticked with `sds-change`. Both
// carry their value in `detail`, so nothing here reads into a shadow root.
document.addEventListener("DOMContentLoaded", () => {
    let showcase = document.querySelector('[data-showcase]');

    if (showcase) {
        drawShowcase(showcase);
    }

    let toc = document.querySelector('sds-nav-toc[data-auto-toc]');
    let content = document.getElementById('main-content');

    if (toc && content) {
        // A heading a Soul element rendered is that element's own, not a section
        // of this page: `sds-card` sets its title as an `h3`, so four cards
        // offering four other pages read to a contents list as four sections of
        // this one. Stated as "inside any `sds-` element" rather than as a list
        // of the components that do it, which would be a list to keep in step
        // with the design system.
        let renderedByComponent = (node) => {
            for (let element = node.parentElement; element; element = element.parentElement) {
                if (element.tagName.startsWith('SDS-')) {
                    return true;
                }
            }
            return false;
        };
        let headings = Array.from(content.querySelectorAll('h2, h3'))
            .filter((heading) => !renderedByComponent(heading));
        let entries = [];
        let parentEntry = null;

        for (let heading of headings) {
            if (!heading.id) {
                let baseId = heading.textContent
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .replace(/&/g, ' and ')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '') || 'section';
                let headingId = baseId;
                let suffix = 2;

                while (document.getElementById(headingId)) {
                    headingId = `${baseId}-${suffix}`;
                    suffix++;
                }

                heading.id = headingId;
            }

            let entry = {
                label: heading.textContent.trim(),
                href: `#${heading.id}`
            };

            if (heading.tagName === 'H2') {
                entries.push(entry);
                parentEntry = entry;
            } else if (parentEntry) {
                parentEntry.items ??= [];
                parentEntry.items.push(entry);
            } else {
                entries.push(entry);
            }
        }

        if (entries.length) {
            toc.setAttribute('entries', JSON.stringify(entries));
        } else {
            toc.closest('.sds-aside').hidden = true;
        }
    }

    let search = document.getElementById('search');
    let bidiFilter = document.getElementById('bidiFilter');
    let iconList = document.getElementById('iconlist');

    if (!search || !iconList) {
        return;
    }

    let searchWord = '';
    let showBidiOnly = false;

    function filterIcons() {
        let icons = iconList.querySelectorAll('[data-type="icon"]');

        for (let i = 0; i < icons.length; i++) {
            let icon = icons[i];
            let elementSearch = icon.dataset.search;
            let isBidi = icon.dataset.bidi === 'true';

            // Check search filter
            let matchesSearch = elementSearch.toLowerCase().indexOf(searchWord) > -1;

            // Check BiDi filter
            let matchesBidi = !showBidiOnly || isBidi;

            // Show icon if it matches both filters
            if (matchesSearch && matchesBidi) {
                icon.style.display = 'flex';
            } else {
                icon.style.display = 'none';
            }
        }
    }

    search.addEventListener('sds-input', (event) => {
        searchWord = String(event.detail ?? '').toLowerCase();
        filterIcons();
    });

    if (bidiFilter) {
        bidiFilter.addEventListener('sds-change', (event) => {
            showBidiOnly = Boolean(event.detail);
            filterIcons();
        });
    }
});
