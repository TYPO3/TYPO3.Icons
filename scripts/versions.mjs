// The version history in meta/: for every icon, the releases that ship it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { options } from './lib/options.mjs';
import { getFolders, getIcons, getMetaData, getMetaFiles, updateMetaData } from './lib/data.mjs';

const git = (...args) => execFileSync('git', args, { maxBuffer: 1 << 28 }).toString();

function sortVersions(versions) {
    return versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// A release ships an icon when a commit behind its tag touched the icon's
// source file. One log per tag answers that for every file at once, where a
// log per file and a tag lookup per commit took thousands of git calls.
function versionsByFile() {
    const versions = {};
    for (const tag of git('tag').split('\n').filter(Boolean)) {
        const version = tag.charAt(0) === 'v' ? tag.substr(1) : tag;
        const files = git('log', tag, '--find-renames=100%', '--name-only', '--pretty=format:', '--', options.src);
        for (const file of new Set(files.split('\n').filter(Boolean))) {
            (versions[file] ??= new Set()).add(version);
        }
    }
    return versions;
}

export async function versionHistory() {
    // Metadata of an icon that no longer exists goes with it.
    for (const folder of getFolders(options.meta)) {
        for (const file of getMetaFiles(path.join(options.meta, folder))) {
            const identifier = path.basename(file, '.yaml');
            if (!fs.existsSync(path.join(options.src, folder, identifier + '.svg'))) {
                fs.rmSync(path.join(options.meta, folder, file), { force: true });
            }
        }
    }

    const versions = versionsByFile();
    for (const folder of getFolders(options.src)) {
        for (const file of getIcons(path.join(options.src, folder))) {
            const identifier = path.basename(file, '.svg');
            const metadata = getMetaData(identifier, folder);
            metadata.changes = sortVersions([...(versions[path.posix.join('src', folder, file)] ?? [])]);
            updateMetaData(identifier, folder, metadata);
        }
    }
}
