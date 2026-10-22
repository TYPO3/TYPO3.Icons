# AGENTS.md

`@typo3/icons`: the SVG icons of the TYPO3 CMS backend, and the style guide
site at https://typo3.github.io/TYPO3.Icons/ that documents them. The full
rules for contributors live in the guide pages under `tmpl/html/docs/guide-*`.
This file is the short version.

## Layout

| Path                         | What it holds                                                      |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/<category>/`            | The source SVGs. The filename is the public identifier.            |
| `meta/<category>/`           | One YAML file per icon: `alias`, `tags`, `changes`, `bidi`.        |
| `dist/`                      | Output of the icon build. Committed, and the package ships it.     |
| `_site/`                     | Output of the site build. Not committed.                           |
| `tmpl/`, `assets/`           | Twig templates, Sass and JavaScript of the site.                   |
| `scripts/`                   | The build: plain Node.js, no task runner. `scripts/task.mjs` runs it. |
| `scripts/lib/pages.mjs`      | Every page of the site. The navigation and the search read it.     |
| `scripts/lib/categories.mjs` | The title and description of each category.                        |
| `typo3.json`                 | The package version that each TYPO3 branch ships.                  |

## Commands

Node.js 24 (`.nvmrc`), dependencies from the lockfile:

```bash
npm ci
npm run stylelint     # Sass of the site
npm run verify        # identifiers, metadata, tags, aliases
npm run icons-build   # src/ + meta/ -> dist/
npm run site-build    # -> _site/
npm run site-serve    # serve _site/
npm run dev           # build everything, then watch
```

CI runs `stylelint`, `verify` and `icons-build`, then `git diff --exit-code -- dist`.
A change to `src/` or `meta/` is complete only with the rebuilt `dist/` in the
same commit. Never edit `dist/` by hand.

## Adding or changing an icon

1. Search the set first. An existing icon can already fit. TYPO3 Core and
   extensions use the identifiers as an API: keep them stable. If you must
   rename one, keep the old name as an `alias` of the new icon.
2. Add `src/<category>/<category>-<name>.svg`. The identifier must start with
   its category.
3. Add `meta/<category>/<identifier>.yaml`:

   ```yaml
   alias: []
   changes: []
   tags:
     - halt
     - abort
     - playback
   ```

   - 3 to 8 tags, English, lowercase. A phrase such as `broken link` is one tag.
   - No tag repeats a word of the identifier. The search reads the identifier
     too.
   - Tags name what the icon shows, what it means in TYPO3 terms, and the
     synonyms people type. Use the words that adjacent icons use for the same
     concept.
   - `npm run version-build` writes `changes` from the Git tags. Leave it `[]`
     for a new icon and do not edit it by hand.
   - `bidi: true` only for logical icons (`-start` / `-end`) that flip in RTL.
     Physical icons (`-left` / `-right`) never flip.
4. `npm run verify && npm run icons-build`, then commit `src/`, `meta/` and
   `dist/` together.

## Drawing rules

Follow the existing icons of the same category. `guide-drawing` and
`guide-modules` have the details.

- Markup: `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 16 16">`
  with the shapes in `<g fill="currentColor">`. No raster images, no editor
  metadata, no `<title>`. svgo removes the title, and the component names the
  icon.
- Grids: 16px for most of the set (1px protective space, so 14px effective,
  1px outlines), 11px for overlays, 32px for the Install Tool, 64px for
  modules, avatar and file folders.
- Every horizontal and vertical edge, and every horizontal or vertical
  extreme of a curve, lies on a whole pixel. Check again the geometry that you
  copy from another icon.
- Corners: convex 0.5px, acute (arrowheads) 0.25px, concave and the ends of
  1px lines sharp. Families keep their own radius (windows: 1px).
- Module icons: 64px canvas, 12px protective space, 4px strokes. Primary
  `currentColor`, secondary `currentColor` with `opacity=".4"`, accent
  `fill="var(--icon-color-accent, #ff8700)"`.

## The site and the Soul design system

The site uses Soul (`@typo3/soul-frontend`): `soul.css` for the tokens and
the `sds-` classes, `soul.js` for the `<sds-*>` elements. The site build
copies its `dist/` to `_site/soul/`. The rules are in
`node_modules/@typo3/soul-frontend/README.md`. `dist/custom-elements.json` in
that package lists every element with its attributes. The manual is at
https://typo3.github.io/soul-design-system/frontend/index.html.

- Write the element, not its classes: `<sds-code code-lang="bash">`,
  `<sds-table>`, `<sds-note>`, not a `div` with `sds-` classes on it. Only the
  page vocabulary is for the hand: `sds-app`, `sds-page`, `sds-prose`, the
  shell (`sds-shell`, `sds-column`, ...) and the type (`sds-h1`, `sds-lead`, ...).
- Never write a `sds-x__part` class and never invent an `sds-` name.
- Site Sass (`assets/scss/docs/`) uses only Soul tokens: `--surface-*`,
  `--text-*`, `--border-*`, `--accent`, `--space-*`, `--radius-*`,
  `--duration-*`. No literal colours or sizes, no raw `--orange-*` scale.
  The one exception is the fixed light and dark specimen grounds in
  `_variables.scss`.
- `npx soul-check tmpl/` lists class markup that an element owns. The existing
  templates are older than this rule and still have findings, so CI does not
  run the check. New or changed markup must not add findings.
- If an element cannot say what a page needs, the gap is in Soul. Report it
  in https://github.com/TYPO3/soul-design-system, and do not restyle the
  element here.

## Writing

Every text in this tree follows the writing rules of the Soul design system:
ASD-STE100 (Simplified Technical English) and the terse rule. The source is
`docs/design-system/writing.rst` in
https://github.com/TYPO3/soul-design-system. The rules bind the guide pages,
the comments, the commit messages, the strings a script prints and this file.
This repository has no prose check. Review holds the rules.

- English only, whatever language the conversation uses.
- A sentence has 25 words at most, 20 in a list item, a table cell or a step.
  A paragraph has 6 sentences at most and one topic.
- An instruction is one action in the imperative. A condition stands before
  it: "If the build fails, read the diff."
- Active voice, simple present. The software, the command or the document is
  the subject: "The icon build writes `dist/`."
- No -ing verb forms: "when the build runs", not "when running the build".
- `must` for a rule, `can` for an ability, `will` for a future fact. Not
  `shall`, `should`, `may`, `might`, `could` or `would`.
- The approved word: "make sure", not "ensure"; "before", not "prior to";
  "use", not "utilize"; "through", not "via"; "if", not "whether"; "but", not
  "however"; "for example", not "e.g.". The full list is `WORDS_REPLACED` in
  `scripts/prose.ts` of the design system.
- Three nouns at most in a row. Every noun that takes an article gets one.
- No `we`. Write `you` only for an action on the reader's own machine.
- Say a rule once and link to it from other places. Cut the story, the second
  example and the aside ("Note that ..."). Keep the reason.
- A claim names its boundary: the source, the versions, the prerequisite.
- Headings are noun phrases in sentence case, or an instruction. Not a
  question.
- Names of tools, packages, paths, keys and commands keep their spelling, in
  mono: `@typo3/icons`, `npm run verify`, `actions-stop`.
- Write a value that the design rests on exactly: 16px, 0.5px. Do not write
  how many icons, pages or checks there are. Name the place that lists them.
- No emoji.

The existing guide pages are older than these rules. Text that you write or
change must follow them.

## Code style

`.editorconfig` applies: LF, final newline, 4 spaces for JS, Twig and
Markdown, 2 for SVG and JSON. Scripts are ES modules (`.mjs`). A comment
gives the reason, in full sentences.

## Commits

These follow the commit rules of the Soul design system, with the prefixes of
this repository in place of its scopes.

- Stage only the files you changed: `git add <path>`, never `git add .` or
  `-A`. The working tree can hold work in progress of other people.
- Commit your own work in small parts, each part when it is complete. It
  stands on its own, the checks are green over it, and a revert takes nothing
  else with it. One icon or a small family of icons, one rule, one page, with
  the rebuilt `dist/` beside the source that changed it.
- The subject goes to the public: the changelog and the release page show it.
  Start it with the effect on the user: `[FEATURE]` new icons or functions,
  `[BUGFIX]` fixes to released icons or behaviour, `[TASK]` maintenance and
  dependencies, `[DOCS]` documentation only, `[!!!]` incompatible changes.
  The sentence says what the change does for the people who install the
  package. It names the identifiers that it adds or changes.
- The body gives the purpose and the reason for the approach. It does not
  repeat the diff.
- No trailers of any kind: no `Co-Authored-By:`, `Signed-off-by:`, `Fixes:`,
  `Claude-Session:` or other `Key: value` lines at the end. The message ends
  with the body.
- A change is complete when every page that describes it is true again, in the
  same commit: the guide pages under `tmpl/html/docs/`, the README and this
  file. If a page is wrong about a different thing, fix it in a separate
  commit.

## Releases

Only maintainers release. `npm version <major|minor|patch>` makes the
`[RELEASE] vX.Y.Z` commit, the changelog entry and the tag. The push of the
tag starts `.github/workflows/release.yml`, which publishes to npm. A removed
or renamed identifier, or a changed file path in `dist/`, is a major release.
Do not move or make again a published tag.
