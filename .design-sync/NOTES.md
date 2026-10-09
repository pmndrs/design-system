# design-sync notes

Repo-specific quirks of the Claude Design sync. The README's "Claude Design"
section has the steps; this file has what a re-sync needs to know.

## Build

```sh
npm run design-bundle   # = cfg.buildCmd: inputs into .design-sync/.cache/design/
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry ./.design-sync/entry.mjs --out ./ds-bundle
npm run design-place    # cards into ds-bundle/guidelines/cards/, auxSha refreshed
node .ds-sync/package-validate.mjs ./ds-bundle --no-render-check
```

Run each as its own command and check its exit code.

## Gotchas

- Tokens-only design system: no component exports, so the converter prints
  `[ZERO_MATCH] ... treating as tokens-only DS` and emits an empty
  `components/`. Expected. The tokens-only path needs an entry file that exists:
  `.design-sync/entry.mjs` (`export {}`), passed with `--entry` (an `entry`
  config key is not documented). Never put it under `.ds-sync/`: its
  `package.json` would become the package dir.
- `[DTS_REACT]` (no `@types/react` in `./node_modules`) is harmless here: there
  are no props to extract.
- `cssEntry` is the generated `.design-sync/.cache/design/styles.css`, copied
  into `_ds_bundle.css`; `styles.css` then imports `fonts/fonts.css` and
  `_ds_bundle.css`.
- Fonts: the compiled CSS names `'Inter'` and `'Inconsolata'`, while fontsource
  names its faces `'Inter Variable'` / `'Inconsolata Variable'`. Hence the
  committed `.design-sync/fonts.css` (latin + latin-ext, variable weight),
  wired through `extraFonts`, pointing at the `@fontsource-variable/*` devDeps.
  Without it the build reports `[FONT_MISSING]`.
- `guidelinesGlob: []`: the `docs/**/*.mdx` pages carry JSX and a pinned
  `#v0.6.0` install line, unsuitable as guidelines. What a design agent reads
  is the `readmeHeader`, the generated `guidelines.md`, stitched at the head of
  the README. Its first lines tell the agent to skip the README's generic
  "Loading" / "Components" sections (the bundle exports nothing).
- The cards (one per docs foundation page and per logo variant) are HTML, which
  `guidelinesGlob` refuses (`.md`/`.mdx` only), and the converter emits HTML
  only under `components/`. `npm run design-place` copies them from the cache
  into `ds-bundle/guidelines/cards/` after the build, then recomputes
  `_ds_sync.json`'s `auxSha` with the converter's own
  `.ds-sync/lib/sync-hashes.mjs`, so it needs the converter staged first.
- `package-validate.mjs` walks only `components/` for HTML: the placed cards get
  no `[DSCARD_MISSING]` / link check. The generator's own test checks the
  `@dsCard` first line instead.
- Validate runs with `--no-render-check`: the maintainer forbids headless
  browsers on this machine, and a tokens-only bundle has no component preview
  to render anyway. `[RENDER_SKIPPED]` is the one expected warning.
- The cards load Inter and Inconsolata from Google Fonts, not from `fonts/`:
  they are self-contained pages (inline CSS, logos as data URIs).

## Re-sync risks

- Card registration outside `components/` is unverified: whether the
  claude.ai/design app registers `@dsCard` files under `guidelines/cards/` was
  not checked. If they do not show in the design-system pane, move the
  placement (one path in `placeCards`, `scripts/design-bundle.mjs`).
- The `resync.mjs` driver runs build -> diff -> validate with no hook, so its
  `.sync-diff.json` is computed before `npm run design-place`: it does not see
  the cards, and its `upload.aux` can be wrong. Run `design-place` and validate
  after it, and upload `guidelines/**` in full regardless of the diff.
- Every `package-build.mjs` run wipes `ds-bundle/`, cards included: always
  re-run `npm run design-place` after a build.
- The guidelines name the logo as `/pmndrs/logo_{complete,idle,animated,loading}.svg`,
  a path that exists only in consumer apps, not in the bundle. A design that
  uses it shows a broken image; the logo cards are the only in-bundle source.
- Version drift: `styles.css` is compiled by the repo's `tailwindcss`, and the
  fonts come from the `@fontsource-variable/*` devDeps (file names in
  `fonts.css` are fontsource's); a major bump of either can rename utilities or
  font files. The README also embeds `@pmndrs/design-system@<version>` from
  `package.json`, so sync from the release tag.
- `.ds-sync/` is a copy of the converter at the version staged: re-copy it
  before each re-sync, since `auxSha` must follow the converter's current recipe.
