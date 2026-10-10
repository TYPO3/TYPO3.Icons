#!/usr/bin/env bash
#
# Writes the GitHub release page for a version tag to stdout.
#
#   scripts/release-notes.sh v5.1.0
#
# The changes are the version's entry in CHANGELOG.md, which `npm version`
# writes, so the page says what the changelog says. The release workflow
# hands the output to `gh release create`. Run it before pushing a tag to
# read the page it will publish.
#
set -euo pipefail

tag="${1:?usage: scripts/release-notes.sh <tag>}"
version="${tag#v}"
package="@typo3/icons"
repository="https://github.com/TYPO3/TYPO3.Icons"
documentation="https://typo3.github.io/TYPO3.Icons/"

# The entry between this version's heading and the next one, without the
# blank lines around it, one list item per commit.
changes="$(awk -v heading="## [${version}]" '
    index($0, heading) == 1 { found = 1; next }
    found && /^## \[/ { exit }
    found { lines[++n] = $0 }
    END {
        first = 1; while (first <= n && lines[first] == "") first++
        last = n; while (last >= first && lines[last] == "") last--
        for (i = first; i <= last; i++) print (lines[i] == "" ? "" : "- " lines[i])
    }
' CHANGELOG.md)"

if [ -z "${changes}" ]; then
    echo "CHANGELOG.md has no entry for ${version}" >&2
    exit 1
fi

# The release before this one. Before the tag exists, that is the latest
# release behind the current commit.
if git rev-parse --verify --quiet "refs/tags/${tag}" >/dev/null; then
    base="${tag}^"
else
    base="HEAD"
fi
previous="$(git describe --tags --abbrev=0 --match 'v[0-9]*' "${base}" 2>/dev/null || true)"

if [ -n "${previous}" ]; then
    compare="[${previous}...${tag}](${repository}/compare/${previous}...${tag})"
else
    compare="[the whole history](${repository}/commits/${tag})"
fi

cat <<EOF
The TYPO3 icon set at **${version}**, published to npm as \`${package}\` from this tag.

## Install

\`\`\`sh
npm install ${package}@${version}
\`\`\`

## What changed

${changes}

## Links

- [Documentation](${documentation}): every icon, its identifiers and how to use it
- [\`${package}\` on npm](https://www.npmjs.com/package/${package}/v/${version})
- [Changelog](${repository}/blob/${tag}/CHANGELOG.md)

**Every commit in this release**: ${compare}
EOF
