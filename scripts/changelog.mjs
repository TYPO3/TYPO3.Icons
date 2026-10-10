// The changelog entry for a new version, written by the npm version hook.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const COMMIT_TYPES = {
    'FEATURE': 'features',
    'BUGFIX': 'bugfixes',
    'TASK': 'tasks',
    '!!!': 'breaking',
    'BREAKING': 'breaking'
};

function categorizeCommits(latestTag) {
    const gitCommand = `git log ${latestTag}..HEAD --oneline --no-merges --grep="^\\[RELEASE\\]" --invert-grep`;
    const commits = execSync(gitCommand).toString().trim();

    if (!commits) {
        return null;
    }

    const categories = {
        breaking: [],
        features: [],
        bugfixes: [],
        tasks: [],
        other: []
    };

    const commitPattern = /^([a-f0-9]+)\s+\[([^\]]+)\]\s+(.+)$/;
    const fallbackPattern = /^([a-f0-9]+)\s+(.+)$/;

    commits.split('\n').forEach(line => {
        const match = line.match(commitPattern);

        if (match) {
            const [, hash, prefix, message] = match;
            const category = COMMIT_TYPES[prefix.toUpperCase()] || 'other';
            categories[category].push({ hash, prefix, message });
        } else {
            const fallbackMatch = line.match(fallbackPattern);
            if (fallbackMatch) {
                const [, hash, message] = fallbackMatch;
                categories.other.push({ hash, prefix: null, message });
            }
        }
    });

    return categories;
}

export async function changelog() {
    try {
        const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const newVersion = pkg.version;

        // Get the latest tag (before the new one)
        const latestTag = execSync('git tag --sort=-v:refname | head -n1').toString().trim();

        if (!latestTag) {
            console.log('No previous tags found, skipping changelog update');
            return;
        }

        const categories = categorizeCommits(latestTag);

        if (!categories) {
            console.log(`No new commits since ${latestTag}`);
            return;
        }

        // Combine all commits in order: breaking, features, bugfixes, tasks, other
        const allCommits = [
            ...categories.breaking,
            ...categories.features,
            ...categories.bugfixes,
            ...categories.tasks,
            ...categories.other
        ];

        // Output preview to console
        console.log('\n' + '='.repeat(60));
        console.log(`Adding to CHANGELOG.md for version ${newVersion}`);
        console.log('='.repeat(60) + '\n');

        allCommits.forEach(item => {
            if (item.prefix) {
                console.log(`${item.hash} [${item.prefix}] ${item.message}`);
            } else {
                console.log(`${item.hash} ${item.message}`);
            }
        });

        console.log('\n' + '='.repeat(60) + '\n');

        // Build the new changelog entry
        const date = new Date().toISOString().split('T')[0];
        let entry = `## [${newVersion}] - ${date}\n\n`;

        allCommits.forEach(item => {
            if (item.prefix) {
                entry += `${item.hash} [${item.prefix}] ${item.message}\n`;
            } else {
                entry += `${item.hash} ${item.message}\n`;
            }
        });

        entry += '\n';

        // Read existing CHANGELOG.md or create new one
        let changelog = '';
        const changelogPath = './CHANGELOG.md';

        if (fs.existsSync(changelogPath)) {
            changelog = fs.readFileSync(changelogPath, 'utf8');

            // Insert new entry after the header
            const lines = changelog.split('\n');
            const headerEndIndex = lines.findIndex((line, i) => i > 0 && line.startsWith('##'));

            if (headerEndIndex !== -1) {
                lines.splice(headerEndIndex, 0, entry);
                changelog = lines.join('\n');
            } else {
                changelog = changelog + '\n' + entry;
            }
        } else {
            // Create new changelog with header
            changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).\n\n${entry}`;
        }

        // Write the updated changelog
        fs.writeFileSync(changelogPath, changelog);
        console.log(`✓ Updated CHANGELOG.md for version ${newVersion}`);
    } catch (error) {
        console.error('Error updating changelog:', error.message);
        throw error;
    }
}
