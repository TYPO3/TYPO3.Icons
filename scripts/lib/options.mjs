// What the build knows about the set that the files themselves do not say.
export const options = {
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
    material: './material/',
};
