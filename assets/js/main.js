// Inplace Search
document.addEventListener("DOMContentLoaded", () => {
    let search = document.getElementById('search');
    if (search) {
        search.addEventListener('keyup', filterIcons);
        function filterIcons() {
            let searchWord = this.value.toLowerCase();
            let iconList = document.getElementById('iconlist');
            let icons = iconList.querySelectorAll('[data-type="icon"]');
            for (let i = 0; i < icons.length; i++) {
                let icon = icons[i];
                let elementSearch = icon.dataset.search;
                if (elementSearch.toLowerCase().indexOf(searchWord) > -1) {
                    icon.style.display = 'flex';
                } else {
                    icon.style.display = 'none';
                }
            }
        }
    }

    document.querySelectorAll('.copy-btn').forEach((button) => {
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
