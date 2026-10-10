// svgo.config.js
module.exports = {
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    collapseGroups: false,
                    removeUnknownsAndDefaults: {
                        keepRoleAttr: true,
                    },
                },
            },
        },
        "cleanupListOfValues",
        "convertStyleToAttrs",
        "removeDimensions",
        "sortAttrs",
        // Not in the default preset since svgo 4. An icon carries no title of
        // its own: the component that places it names it.
        "removeTitle",
    ],
};
