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
                    removeViewBox: false,
                    removeAttrs: {
                        attrs: [
                            "data-name",
                            "clip-rule"
                        ]
                    }
                },
            },
        },
        "cleanupListOfValues",
        "convertStyleToAttrs",
        "removeDimensions",
        "sortAttrs",
    ],
};
