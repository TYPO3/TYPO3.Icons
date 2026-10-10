// A stylesheet compiled the way the Sass CLI would, then minified. The icon
// stylesheets and the site's stylesheet go through the same two steps.
import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';
import CleanCSS from 'clean-css';

export async function compileCss(file) {
    const source = await fs.promises.readFile(file, 'utf8');
    const result = await sass.compileStringAsync(source, { loadPaths: [path.dirname(file)] });
    const target = path.resolve(file).replace(/\.scss$/, '.css');
    // Keyed by its path, so clean-css rebases relative URLs from where the
    // stylesheet stands to where it is written, which is the same folder.
    const minified = await new CleanCSS({ rebaseTo: path.dirname(target) }).minify({ [target]: { styles: result.css } });
    if (minified.errors.length) {
        throw new Error(minified.errors.join(' '));
    }
    return minified.styles;
}
