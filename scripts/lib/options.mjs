// Where the build reads and writes. What the categories are and how the site
// presents them is in categories.mjs, and the pages of the site in pages.mjs.
export const options = {
    src: './src/',
    meta: './meta/',
    assets: './assets/',
    dist: './dist/',
    dist_svgs: './dist/svgs/',
    dist_sprites: './dist/sprites/',
    dist_scss: './dist/scss/',
    site: './_site/',
    soul: './node_modules/@typo3/soul-frontend/dist/',
    // Where the built site is published. Only llms.txt needs it: it is read
    // away from the page it sits on, so the relative paths the rest of the
    // build works in lose their meaning there and every link has to be whole.
    siteUrl: 'https://typo3.github.io/TYPO3.Icons/',
};
