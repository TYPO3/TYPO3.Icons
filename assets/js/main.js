// Inplace Search and BiDi Filter
document.addEventListener("DOMContentLoaded", () => {
    let search = document.getElementById('search');
    let bidiFilter = document.getElementById('bidiFilter');
    let iconList = document.getElementById('iconlist');

    if (search && iconList) {
        search.addEventListener('keyup', filterIcons);

        if (bidiFilter) {
            bidiFilter.addEventListener('change', filterIcons);
        }

        function filterIcons() {
            let searchWord = search.value.toLowerCase();
            let showBidiOnly = bidiFilter ? bidiFilter.checked : false;
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
    }

    document.querySelectorAll('.code-copy-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const codeBlock = button.nextElementSibling?.querySelector('code');

            if (codeBlock) {
                const textToCopy = codeBlock.textContent.trim();

                navigator.clipboard
                    .writeText(textToCopy)
                    .then(() => {
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                            button.textContent = 'Copy';
                        }, 2000);
                    })
                    .catch((error) => {
                        console.error('Failed to copy text:', error);
                    });
            }
        });
    });
});

// Theme
const getPreferredTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
const setTheme = (theme) => {
    if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-bs-theme', 'dark')
    } else {
    document.documentElement.setAttribute('data-bs-theme', theme)
    }
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    setTheme(getPreferredTheme())
});
setTheme(getPreferredTheme());
