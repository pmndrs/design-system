# @pmndrs/design-system

## 0.4.0

### Minor Changes

- [`466a6ef`](https://github.com/pmndrs/design-system/commit/466a6efce2a652057fa81882ffb6a8e59e79dd06) Thanks [@abernier](https://github.com/abernier)! - `npm run build` now also writes `figma/Light.tokens.json` and `figma/Dark.tokens.json` —
  the palette as DTCG tokens, two modes of one Figma variable collection. Nothing an
  installed item carries changes; this is the same colours for the other half of the team.
  
  They come off the same `builder()` call as the baked CSS rather than a second one, so
  every one of the 434 values matches `registry.json` alias for alias — a designer picking
  `Surface Container Low` gets the hex the site renders, and a reseed moves both in the same
  run. Committed, 190 kB and all: nothing here is published to npm, so a tag is the only
  address a designer can be handed.

- [#7](https://github.com/pmndrs/design-system/pull/7) [`3ce9073`](https://github.com/pmndrs/design-system/commit/3ce90735420cc2c37a3d1a3556b4fc1e59b836a2) Thanks [@abernier](https://github.com/abernier)! - `md3-base` is two lines pointing at the package, instead of copies of it.
  
  Its `css` field carried the 31 declarations mapping shadcn's variables onto MD3
  roles — a verbatim copy of `material-theme-builder/shadcn.css`, kept in step by
  hand. It was a copy because the package's block had to land *after* shadcn's own
  `:root {}` / `.dark {}`, which an `@import` cannot do. v4 doubles the selectors
  (`:root:root, .dark.dark`), so it wins on specificity wherever it lands.
  
  The Tailwind mapping moves from the stylesheet to the `@plugin` of the same
  name, which arrived in 3.3.0 — after the `^3.2.0` this item asked for, hence
  unavailable until now. v5 then deleted the stylesheet outright, so this is no
  longer a preference between two spellings. Two things follow from it anyway.
  
  Order stops being load-bearing. A plugin contributes theme *defaults*, so
  shadcn's `@theme inline` keeps the three names they collide on — `background`,
  `primary`, `secondary`. The stylesheet takes them instead when it lands after
  shadcn's block, and `bg-secondary` silently stops being the container colour:
  `#d3e5f5` becomes `#50606e`, and every `<Button variant="secondary">` with it.
  Nothing errors. The installer happens to write the import above that block
  today, which is the only reason this was not already a bug.
  
  Custom colours stop needing hand-written CSS. They took four `@theme` lines
  each — `--color-note`, `--color-on-note`, `--color-note-container`,
  `--color-on-note-container` — and a forgotten line meant no rule and no error.
  Now they are named where the plugin is:
  
  ```css
  @plugin "material-theme-builder/tailwind" {
    custom-colors: note;
  }
  ```
  
  Four roles and eleven shades follow, `bg-note` through `bg-note-950`.
  
  Nothing changes for anyone installing `md3`: same variables, same values. The
  peer bump is real — `material-theme-builder` is now `^5.0.0`. The palette it
  computes is byte-identical across 3.3, 4 and 5.

- [`f46f2a9`](https://github.com/pmndrs/design-system/commit/f46f2a9dc6186aa81b4572f1cbeabf318813d7b3) Thanks [@abernier](https://github.com/abernier)! - The seed moves from the mint `#5de4c7` to the slate `#323e48`. Every tonal value in the
  baked palette shifts with it, so this is a visible change for anything installing `md3` —
  hence a minor, not a patch. `THEME_PRIMARY` still overrides it, and the scheme and
  contrast are untouched.

### Patch Changes

- [`1a35e18`](https://github.com/pmndrs/design-system/commit/1a35e189b9eb9b4f60cbef8973ad1d675af7b3c3) Thanks [@abernier](https://github.com/abernier)! - Release tooling. The package is never published to npm — the git tag is the install address (`md3#v0.3.0`) — so changesets is set up purely to version, changelog and tag, with `privatePackages.tag` doing the last part. `npm run version` also refreshes the lockfile, since bumping the version by hand twice is what left it recording `0.1.0` against a `0.3.0` package and broke CI on its first run.
  
  `react` and `react-dom` are now explicit devDependencies. `material-theme-builder` declares them as required peers, and npm resolved that differently locally than on the runner, so `npm ci` was reproducible in one place and not the other.
  
  The version is no longer written down in nine places. `scripts/build.mjs` derives it from `package.json`, so the cross-item ref `md3` pins on `md3-base` follows a release instead of freezing at whatever it was when someone typed it — and `npm run build` rewrites the install addresses quoted in the READMEs. `npm run version` runs the build, and `check-build` fails the release if it somehow didn't.
