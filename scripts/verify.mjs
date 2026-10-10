// The checks a change to src/ or meta/ has to pass, so the rules the guide
// states for metadata hold without a reviewer counting tags by hand.
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { options } from './lib/options.mjs';
import { getFolders, getIcons, getMetaDataFileName, getMetaFiles } from './lib/data.mjs';

const KEYS = ['alias', 'changes', 'tags', 'bidi'];
const TAGS = { min: 3, max: 8 };

export async function verify() {
    const findings = [];
    const report = (where, problem) => findings.push(`${where}: ${problem}`);

    const identifiers = new Set();
    for (const folder of getFolders(options.src)) {
        for (const file of getIcons(path.join(options.src, folder))) {
            const identifier = path.basename(file, '.svg');
            identifiers.add(identifier);
            if (!identifier.startsWith(folder + '-')) {
                report(`src/${folder}/${file}`, `the identifier does not start with its category "${folder}-"`);
            }
            if (!fs.existsSync(getMetaDataFileName(identifier, folder))) {
                report(`src/${folder}/${file}`, 'has no metadata file in meta/');
            }
        }
    }

    const aliases = {};
    for (const folder of getFolders(options.meta)) {
        for (const file of getMetaFiles(path.join(options.meta, folder))) {
            const identifier = path.basename(file, '.yaml');
            const where = `meta/${folder}/${file}`;
            if (!fs.existsSync(path.join(options.src, folder, identifier + '.svg'))) {
                report(where, 'belongs to no icon in src/');
                continue;
            }
            const meta = yaml.load(fs.readFileSync(path.join(options.meta, folder, file), 'utf8')) ?? {};
            for (const key of Object.keys(meta).filter((key) => !KEYS.includes(key))) {
                report(where, `unknown key "${key}", expected ${KEYS.join(', ')}`);
            }

            // Tags, as the contributing guide states them: three to eight, in
            // lowercase, and none of them a word the identifier already holds.
            const tags = meta.tags ?? [];
            const words = new Set(identifier.split(/[-_]/));
            if (tags.length < TAGS.min || tags.length > TAGS.max) {
                report(where, `has ${tags.length} tags, expected ${TAGS.min} to ${TAGS.max}`);
            }
            for (const tag of tags) {
                if (typeof tag !== 'string' || tag !== tag.trim().toLowerCase() || tag === '') {
                    report(where, `tag "${tag}" is not lowercase text without outer spaces`);
                } else if (words.has(tag)) {
                    report(where, `tag "${tag}" repeats a word of the identifier`);
                }
            }
            for (const tag of new Set(tags.filter((tag, index) => tags.indexOf(tag) !== index))) {
                report(where, `tag "${tag}" is listed twice`);
            }

            // An alias resolves an old identifier to this icon, so it can name
            // one icon only, and never an identifier that exists today.
            for (const alias of meta.alias ?? []) {
                if (identifiers.has(alias)) {
                    report(where, `alias "${alias}" is the identifier of an existing icon`);
                } else if (alias in aliases) {
                    report(where, `alias "${alias}" is an alias of ${aliases[alias]} as well`);
                }
                aliases[alias] ??= identifier;
            }
        }
    }

    if (findings.length) {
        console.error(findings.join('\n'));
        throw new Error(`${findings.length} finding(s) in src/ and meta/`);
    }
    console.log(`${identifiers.size} icons and their metadata follow the rules`);
}
