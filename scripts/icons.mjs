// The package: dist/, built from src/ and the stylesheets under assets/scss.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, optimize } from 'svgo';
import SVGSpriter from 'svg-sprite';
import { options } from './lib/options.mjs';
import { compileCss } from './lib/css.mjs';
import { escapeSvg, getCategories, getData, getFolders, getIcons, loadIcons } from './lib/data.mjs';

export async function iconsClean() {
    await fs.promises.rm(options.dist, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

// The source stylesheet ships next to the compiled one, so a project that
// builds its own CSS can import it with its own variables.
export async function iconsSass() {
    await fs.promises.mkdir(options.dist, { recursive: true });
    await Promise.all(['icons.scss', 'icons-bootstrap.scss'].map(async (name) => {
        const file = path.join(options.assets, 'scss', name);
        await fs.promises.copyFile(file, path.join(options.dist, name));
        await fs.promises.writeFile(path.join(options.dist, name.replace(/\.scss$/, '.css')), await compileCss(file));
    }));
}

// Every source SVG through svgo with the project's svgo.config.js.
export async function iconsMin() {
    const config = await loadConfig(path.resolve('svgo.config.js'));
    for (const folder of getFolders(options.src)) {
        await fs.promises.mkdir(path.join(options.dist_svgs, folder), { recursive: true });
        for (const file of getIcons(path.join(options.src, folder))) {
            const source = await fs.promises.readFile(path.join(options.src, folder, file), 'utf8');
            const result = optimize(source, config);
            if (typeof result.data !== 'string') {
                throw result.error ?? new Error('svgo returned nothing for ' + file);
            }
            await fs.promises.writeFile(path.join(options.dist_svgs, folder, file), result.data);
        }
    }
}

// One symbol sprite per category, from the minified SVGs in a sorted order so
// the sprite does not change with the order the file system lists them in.
export async function iconsSprites() {
    await fs.promises.mkdir(options.dist_sprites, { recursive: true });
    await Promise.all(getFolders(options.dist_svgs).map(async (folder) => {
        const spriter = new SVGSpriter({
            svg: {
                rootAttributes: {
                    class: 'typo3-icons-' + folder,
                    style: 'display: none;'
                },
                namespaceIDs: true,
                namespaceClassnames: false
            },
            shape: {
                transform: [
                    {
                        svgo: {
                            plugins: [
                                {
                                    name: 'preset-default',
                                },
                                {
                                    name: 'removeAttrs',
                                    params: {
                                        attrs: 'xml:space',
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
            mode: {
                symbol: {
                    dest: '',
                    sprite: folder + '.svg'
                }
            }
        });
        for (const file of getIcons(path.join(options.dist_svgs, folder)).sort()) {
            const filePath = path.resolve(options.dist_svgs, folder, file);
            spriter.add(filePath, file, await fs.promises.readFile(filePath, 'utf8'));
        }
        const { result } = await spriter.compileAsync();
        await fs.promises.writeFile(path.join(options.dist_sprites, folder + '.svg'), result.symbol.sprite.contents);
    }));
}

export async function iconsData(icons = loadIcons()) {
    await fs.promises.writeFile(options.dist + 'icons.json', JSON.stringify(getData(icons), null, 2), 'utf8');
}

// Every icon as a Sass variable holding the drawing as a data URI, one file
// per category, and one file that forwards them all.
export async function iconsVariables(icons = loadIcons()) {
    const categories = getCategories();
    await fs.promises.rm(options.dist_scss, { recursive: true, force: true });
    await fs.promises.mkdir(options.dist_scss, { recursive: true });

    const categoryFiles = {};
    for (const [identifier, icon] of Object.entries(icons).sort(([a], [b]) => a.localeCompare(b))) {
        const inlineIcon = fs.readFileSync(path.join(options.dist, icon.svg), 'utf8');
        (categoryFiles[icon.category] ??= []).push(`$icon-${identifier}: url("data:image/svg+xml,${escapeSvg(inlineIcon)}") !default;`);
    }
    for (const [category, variables] of Object.entries(categoryFiles)) {
        await fs.promises.writeFile(options.dist_scss + `icons-variables-${category}.scss`, variables.join('\n') + '\n', 'utf8');
    }

    const forwards = categories
        .sort((a, b) => a.identifier.localeCompare(b.identifier))
        .map((category) => `@forward 'icons-variables-${category.identifier}';`)
        .join('\n') + '\n';
    await fs.promises.writeFile(options.dist_scss + 'icons-variables.scss', forwards, 'utf8');
}

// The two outputs read from the icons and their metadata, from one read.
export async function iconsOutputs() {
    const model = loadIcons();
    await iconsData(model);
    await iconsVariables(model);
}

export async function icons() {
    await iconsClean();
    await iconsSass();
    await iconsMin();
    await iconsSprites();
    await iconsOutputs();
}
