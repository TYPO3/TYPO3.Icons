// The build, one task per argument, run in the order given:
//
//   node scripts/task.mjs icons site
//
// `watch` rebuilds what a change touches and runs until stopped, and `dev`
// builds everything first. The npm scripts in package.json name these tasks.
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { options } from './lib/options.mjs';
import { icons, iconsMin, iconsOutputs, iconsSass, iconsSprites } from './icons.mjs';
import { site, siteBuild } from './site.mjs';
import { versionHistory } from './versions.mjs';
import { changelog } from './changelog.mjs';

function playSound() {
    // Try different sound commands based on platform (silently)
    const soundCommands = [
        'echo -e "\\a"',  // Terminal bell
        'paplay /usr/share/sounds/alsa/Front_Left.wav 2>/dev/null',  // Linux
        'afplay /System/Library/Sounds/Glass.aiff 2>/dev/null',  // macOS
        'powershell -c "[console]::beep(800,200)" 2>$null'  // Windows
    ];

    soundCommands.forEach(cmd => {
        exec(cmd, { stdio: 'ignore' }, () => {}); // Completely silent
    });

    console.log('✅ Build complete!');
}

// What a change under each watched path rebuilds.
const rebuilds = [
    { path: options.src, match: (file) => file.endsWith('.svg'), steps: [iconsMin, iconsSprites, iconsOutputs, siteBuild] },
    { path: options.meta, match: (file) => file.endsWith('.yaml'), steps: [iconsOutputs, siteBuild] },
    { path: options.assets + 'scss/', match: (file) => file.endsWith('.scss'), steps: [iconsSass, siteBuild] },
    { path: './tmpl/', match: (file) => file.endsWith('.twig'), steps: [siteBuild] },
    { path: './', match: (file) => file === 'typo3.json', steps: [siteBuild], recursive: false },
];

// One rebuild at a time. A change that arrives during a rebuild runs once
// after it, however many files it touched.
function watch() {
    let running = null;
    let queued = null;
    const run = async (steps) => {
        if (running) {
            queued = steps;
            return;
        }
        running = steps;
        try {
            for (const step of steps) {
                await step();
            }
            playSound();
        } catch (error) {
            console.error(error);
        }
        running = null;
        if (queued) {
            const next = queued;
            queued = null;
            await run(next);
        }
    };
    for (const rebuild of rebuilds) {
        fs.watch(rebuild.path, { recursive: rebuild.recursive ?? true }, (event, file) => {
            if (file && rebuild.match(String(file))) {
                console.log(`${event}: ${rebuild.path}${file}`);
                run(rebuild.steps);
            }
        });
    }
    console.log('🔍 Watching for file changes...');
}

const tasks = {
    icons: icons,
    site: site,
    version: versionHistory,
    changelog: changelog,
    watch: watch,
    dev: async () => {
        await icons();
        await site();
        watch();
    },
};

const names = process.argv.slice(2);
const unknown = names.filter((name) => !(name in tasks));
if (names.length === 0 || unknown.length > 0) {
    console.error(`Usage: node scripts/task.mjs <${Object.keys(tasks).join('|')}> ...`);
    if (unknown.length > 0) {
        console.error(`Unknown task: ${unknown.join(', ')}`);
    }
    process.exit(1);
}
for (const name of names) {
    const started = Date.now();
    await tasks[name]();
    if (name !== 'watch' && name !== 'dev') {
        console.log(`Finished '${name}' after ${((Date.now() - started) / 1000).toFixed(2)} s`);
    }
}
