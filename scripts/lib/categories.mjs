// The categories, one entry per folder under src/. The folder names stay
// stable for package paths and URLs; everything here is what a reader sees.
//
// - title: the reader-facing name, which explains what a category contains
//   before somebody has to learn the repository vocabulary.
// - description: what the category answers, in one sentence. A fact about the
//   category, not about the page that happens to show it.
// - rendering: how its pages draw an icon.
// - minor: a category a reader browsing the set has little reason to open: a
//   single placeholder, a fallback, a handful of folder states. It stays in the
//   navigation and keeps its pages, but stops competing for attention with the
//   categories somebody actually came for.
export const categories = {
    actions: {
        title: 'Actions',
        description: 'Icons for common interface actions such as adding, editing, saving, deleting, moving and navigating.',
        rendering: { preview: true, buttons: true },
    },
    apps: {
        title: 'Page and file trees',
        description: 'Page-tree and file-tree icons for node types, permissions, visibility states and drag-and-drop actions.',
        rendering: { preview: true, buttons: true },
    },
    avatar: {
        title: 'Avatars',
        description: 'The default avatar shown when a backend user has not uploaded a profile image.',
        rendering: { preview: true, buttons: true },
        minor: true,
    },
    content: {
        title: 'Content elements',
        description: 'Icons for TYPO3 content elements, from text and media to forms, navigation and structured layouts.',
        rendering: { preview: true, buttons: true },
    },
    default: {
        title: 'Fallbacks',
        description: 'Fallback icons for identifiers that cannot be resolved to a specific asset.',
        rendering: { preview: true, buttons: true },
        minor: true,
    },
    files: {
        title: 'Folders',
        description: 'Folder icons for the file list, including common folder types and states.',
        rendering: { preview: true },
        minor: true,
    },
    form: {
        title: 'Forms',
        description: 'Icons for the TYPO3 form editor, from text fields and checkboxes to file uploads and finishers.',
        rendering: { preview: true, buttons: true },
    },
    information: {
        title: 'System information',
        description: 'Icons for TYPO3 version, operating system and other installation information.',
        rendering: { preview: true },
        minor: true,
    },
    install: {
        title: 'Install tool',
        description: 'Icons for environment checks, cache operations, database tools and other installation tasks.',
        rendering: { preview: true },
    },
    mimetypes: {
        title: 'File types',
        description: 'File-type icons for documents, images, archives, source files, audio and video.',
        rendering: { preview: true, buttons: true },
    },
    miscellaneous: {
        title: 'Placeholders',
        description: 'General-purpose placeholders for content or objects without a dedicated icon.',
        rendering: { preview: true, buttons: true },
        minor: true,
    },
    module: {
        title: 'Backend modules',
        description: 'Large-format icons designed for TYPO3 backend modules and the module menu.',
        rendering: { preview: true, menuview: true },
    },
    overlay: {
        title: 'Overlays',
        description: 'Compact status marks that add meaning to another icon, including hidden, locked, translated and deleted.',
        rendering: { overlay: true },
    },
    spinner: {
        title: 'Loading',
        description: 'The animated loading indicator for processes that are still in progress.',
        rendering: { preview: true, buttons: true, spinning: true },
        minor: true,
    },
    status: {
        title: 'User status',
        description: 'Icons for backend users, administrators, groups and authentication states.',
        rendering: { preview: true, buttons: true },
    },
};

// Which categories the front page may open with. Named rather than derived:
// the wall is the first thing a reader sees and what belongs on it is an
// editorial decision, not a side effect of a category being large.
//
// Overlays are out because they are fragments meant to sit in the corner of
// another icon, and alone in a box they read as clipped. The minor
// categories are out for the reason they are minor: a single placeholder or
// fallback says nothing about the set. Shorten this list to narrow the wall;
// fewer entries than tiles is fine, the browser draws from what it is given.
export const showcase = ['actions', 'content', 'form', 'mimetypes'];
