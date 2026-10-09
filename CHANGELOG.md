# @pmndrs/design-system

## 0.9.1

### Patch Changes

- [#48](https://github.com/pmndrs/design-system/pull/48) [`0fd1a9c`](https://github.com/pmndrs/design-system/commit/0fd1a9ca792a0523bc23c33f424a7af77ec09998) Thanks [@abernier](https://github.com/abernier)! - `font-mono` declares the `latin` subset, so on Next shadcn writes `subsets: ["latin"]` into the `next/font/google` call. Before, the call had no subsets: nothing was preloaded, and `next build --webpack` failed with "Preload is enabled but no subsets were specified". To fix an existing layout, re-run `shadcn add` for `font-mono` (or `theme`) at the new tag: it rewrites the `--font-mono` initializer.

## 0.9.0

### Minor Changes

- [#45](https://github.com/pmndrs/design-system/pull/45) [`e8e160c`](https://github.com/pmndrs/design-system/commit/e8e160cd9c2155441e61ec948ead8dd4ab77a0da) Thanks [@abernier](https://github.com/abernier)! - Open the design system to designers and their tools: a hosted registry, a preset, a v0 theme, Figma foundation tokens, a Guidelines page and a Motion foundations page.
  
  **Hosted registry.** The docs site hosts the registry, so it can be declared as a shadcn namespace.
  
  - Every item is served as static JSON at `https://pmndrs.github.io/design-system/r/{name}.json`, with the index at `r/registry.json`. Add `"@pmndrs": "https://pmndrs.github.io/design-system/r/{name}.json"` to `registries` in `components.json`, then `npx shadcn@latest add @pmndrs/theme`. The shadcn MCP server reads the same namespace to list, read and install the items.
  - The files are built from `registry.json` by `shadcn build` on every deploy of `main`, so the namespace serves the latest state of `main`. The git address (`pmndrs/design-system/theme#<tag>`) is unchanged and stays the pinned one.
  - A branch's Vercel preview serves that branch's own `r/` files, but `preset`'s dependency on `theme` still resolves to the released tag, not to the branch.
  - `npm run hosted-registry [dir]` writes the same files locally, into `public/r/` by default.
  
  **Preset and v0.** Start a project from the hosted registry, with `shadcn init` or in v0.
  
  - `preset` (new, `registry:base`) is the poimandres preset and the theme in one item: `npx shadcn@latest init https://pmndrs.github.io/design-system/r/preset.json` configures style `base-luma`, Inter, the default radius and lucide icons, installs `theme`, and declares the `@pmndrs` namespace in `components.json`. No preset code needed. Its colours are `theme`'s: it declares none, so the MD3 remap stays in charge.
  - `v0` (new, `registry:item`) is what the README's "Open in v0" link opens: one `app/globals.css` with shadcn's colours resolved to the pmndrs palette, light and dark, Inter, Inconsolata and the default radius. v0 reads neither `css` nor `cssVars`, so the theme travels as a file.
  - `font-mono` now names `'Inconsolata Variable', monospace`, the family `@fontsource-variable/inconsolata` registers. Outside Next, `--font-mono` named `Inconsolata` and only rendered where the font was installed locally.
  
  **Figma foundation tokens.** `figma-tokens` ships the foundations beside the palette: four files instead of two.
  
  - `Foundations.tokens.json` is a second Figma variable collection, imported natively: font families, sizes, line heights and weights, spacing, radius, durations and ease curves, each scoped to the pickers it belongs in. Lengths and line heights are in px and durations in seconds, the units Figma's import takes.
  - `Styles.tokens.json` is a text style per step of the type scale and an effect style per shadow, for Tokens Studio, synced read-only from the one file. The text styles bind to the variables by name.
  - Every value is read off the Typography, Spacing, Radius, Shadows and Motion pages, and tested against them and against the Claude Design artifact's tokens.
  - The Typography page gains a Font weight table, Tailwind v4's `font-*` scale, which the font weight variables are read from.
  
  **Guidelines.** The brand book is published outside the Claude Design artifact: a Guidelines page on the docs site, and a `guidelines` item.
  
  - The docs site gains a Guidelines section, right after Getting Started: the do and don't of colour, type, spacing, radii and shadows, components, the logo, iconography and voice. It flows into `llms-full.txt` and the pmndrs docs MCP with the rest of the site.
  - `guidelines` (new, `registry:item`) writes the same text to `guidelines/Guidelines.md` at the root of the project: the file Figma Make reads, and one to point Claude or Cursor at.
  - Both are generated from the artifact's `README.md`, so the three cannot drift. Passages that only make sense inside the artifact (the "Not synced" list) stay out, and the brand book now names tokens the way a stylesheet does: `--md-sys-color-surface-dim`, `--radius-sm`, `rounded-sm`, `p-4`.
  
  **Motion.** A Motion foundations page: the transition durations and ease curves your project gets, as Tailwind v4 ships them.
  
  - The page lists the two variables a transition falls back on (`--default-transition-duration`, `--default-transition-timing-function`), the `duration-*` steps and the `ease-*` curves, in the same table format as the other foundations pages.
  - The foundations tables are read in one place, `scripts/foundations.mjs`, and tested against Tailwind v4's own defaults wherever a page says it inherits them.

- [#49](https://github.com/pmndrs/design-system/pull/49) [`289d4ed`](https://github.com/pmndrs/design-system/commit/289d4ed9e179d931fec0bd7c8b4962157571faf7) Thanks [@abernier](https://github.com/abernier)! - Make the `v0` item a whole v0 project, so Open in v0 needs no babysitting, and add a second Open in v0 link that asks v0 for the brand guidelines.
  
  - `app/globals.css` now declares every Material Design 3 role (the primary, secondary and tertiary containers, the `surface-container` steps, the seven brand colours and the five alert colours, with their `on-*` roles) and the tonal shades, as literal values light and dark, read off the bake. They are mapped in `@theme inline` under the utility names a pmndrs project gets from `theme` and the MD3 Tailwind plugin: `bg-primary-container`, `bg-surface-container-high`, `bg-lime-container`, `bg-purple-500`. Code v0 writes runs unchanged in a pmndrs app.
  - The brand lime is `bg-lime-container`, with `text-on-lime-container` on it. `bg-lime` is a dark olive in light.
  - The stylesheet opens by saying it is the pmndrs palette, not the Poimandres VS Code theme, and that it is not to be edited.
  - The item adds `app/layout.tsx` (the stylesheet, `lang="en"`, the fonts) and `app/page.tsx`, a starter that renders the logo, the brand colours, the type and a light/dark toggle through tokens only. The preview is no longer blank.
  - The item ships the logo into `public/pmndrs/` and the brand book as `guidelines/Guidelines.md`, from the same files as the `logo` and `guidelines` items.
  - The README and the getting-started page gain a "brand guidelines" Open in v0 link: the same item, with a prompt (under v0's 500-character limit) for 16:9 slides on an editorial grid. The build writes both links, so the prompt's token names follow the code.

## 0.8.0

### Minor Changes

- [#38](https://github.com/pmndrs/design-system/pull/38) [`6a4d097`](https://github.com/pmndrs/design-system/commit/6a4d0976bf4e8d0dae9445b9044b9919e85a37a9) Thanks [@abernier](https://github.com/abernier)! - Add five semantic alert roles to `md3-base`: `note`, `tip`, `important`, `warning` and `caution`.
  
  They are custom colours seeded with GitHub's alert hues, and blended toward the source seed. They come after the seven brand colours. Each one is overridable with `THEME_NOTE`, `THEME_TIP`, `THEME_IMPORTANT`, `THEME_WARNING` or `THEME_CAUTION`.
  
  `theme` bakes their four roles, light and dark, and their tonal palettes. The Figma tokens and the Claude Design artifact carry them too.

## 0.7.0

### Minor Changes

- [#34](https://github.com/pmndrs/design-system/pull/34) [`084c1b6`](https://github.com/pmndrs/design-system/commit/084c1b6eedfdcad9d8ad2fa24a8d5678e77274b4) Thanks [@abernier](https://github.com/abernier)! - The poimandres shadcn preset is now `b1VlIttI` (was `b5cR4Y50S`): the preset the pmndrs docs sites were created with (pmndrs/docs#599), so the design system and the docs share one code. It moves the style from `base-nova` to `base-luma`, and theme and chartColor from `teal` to `neutral`. The colour change has no visible effect: the MD3 layer remaps every shadcn colour token. The radius scale `base-luma` writes is the same as `base-nova`'s (`--radius: 0.625rem`, multiplicative steps); the Radius, Typography and Getting Started pages now name the new style and code.

## 0.6.0

### Minor Changes

- [#23](https://github.com/pmndrs/design-system/pull/23) [`df567c9`](https://github.com/pmndrs/design-system/commit/df567c918f2099c44008e8db24feacafc04266d4) Thanks [@abernier](https://github.com/abernier)! - Add two items that ship files rather than code, as `registry:file`s copied byte for byte to their `target`:
  
  - `logo`: the four SVGs of the Assets page — `logo_complete`, `logo_idle`, `logo_animated` and `logo_loading` — into `public/pmndrs/`, so `<img src="/pmndrs/logo_loading.svg" />` works as installed. The PNGs stay downloads: the CLI reads every file as text.
  - `figma-tokens`: the Figma tokens, `Light.tokens.json` and `Dark.tokens.json`, into `design/tokens/pmndrs/` — the same DTCG files `figma/` has, now with an install address.
  
  Both land at the root of the project, `src/` directory or not: every target starts with `~/`. A bare `public/…` target would have landed in `src/public/` in an app made with `create-next-app --src-dir`, where nothing serves it.

- [#30](https://github.com/pmndrs/design-system/pull/30) [`3934fe1`](https://github.com/pmndrs/design-system/commit/3934fe14f81951554115f086c96d9ad4fd999d19) Thanks [@abernier](https://github.com/abernier)! - Rename the `md3` item to `theme`, the single install target, and ship Inconsolata as the pmndrs monospace font.
  
  - `theme` (was `md3`) carries the baked pmndrs palette and now depends on `md3-base` and the new `font-mono`. Breaking: replace `pmndrs/design-system/md3#<ref>` with `pmndrs/design-system/theme#<ref>`, in `shadcn add` commands and in `registryDependencies`.
  - `font-mono` (new, `registry:font`) sets `--font-mono` to Inconsolata, through `next/font/google` on Next.js and `@fontsource-variable/inconsolata` elsewhere, applied to `code, kbd, samp, pre` only.
  - `md3-base` is unchanged, and still installs on its own for a palette of your own.

## 0.5.0

### Minor Changes

- [#16](https://github.com/pmndrs/design-system/pull/16) [`b5b4906`](https://github.com/pmndrs/design-system/commit/b5b490674c87b7bda15dd5b3ef8a698387ec3a41) Thanks [@abernier](https://github.com/abernier) and [@castavridis](https://github.com/castavridis)! - **Breaking:** the placeholder `brand` and `status` custom colours are removed, with their utilities (`bg-brand`, `text-on-status`, …) and their Figma collections. Use the named brand colours below instead.

  Add the seven brand colours as named custom colours: `lime`, `teal`, `cyan`, `purple`, `red`, `orange` and `yellow` — `bg-lime`, `text-on-teal`, `bg-cyan-container`, `bg-purple-500` and so on, plus a `Lime` … `Yellow` collection in the Figma tokens. They replace the placeholder `brand` and `status` custom colours, which are gone with their utilities and Figma collections.

- [#16](https://github.com/pmndrs/design-system/pull/16) [`b5b4906`](https://github.com/pmndrs/design-system/commit/b5b490674c87b7bda15dd5b3ef8a698387ec3a41) Thanks [@abernier](https://github.com/abernier) and [@castavridis](https://github.com/castavridis)! - **Breaking:** every colour changes, in both schemes, and `THEME_SCHEME` is removed: Color match does not use a scheme.

  Reseed the palette with the brand lime under Material Theme Builder's Color match, with greyer neutrals.
  
  `pmndrsMtb` now seeds `source: '#CAF543'` with `colorMatch: true` ("Stay true to my color inputs") in place of the poimandres slate `#323e48` under `scheme: 'tonalSpot'`, and seeds the neutral ramps and the error role itself: `neutral: '#c1b793'`, `neutralVariant: '[#495720](https://github.com/pmndrs/design-system/issues/495720)'`, `error: '#FF4980'`. Under Color match a neutral ramp takes an eighth of its seed's chroma (neutral-variant adds 4), so those seeds give surfaces and body text a warm grey at chroma 2, and outlines and secondary text the lime's hue at chroma 8. The light background moves from `#f7f9ff` to `#fef8f4`, the dark one from `[#101417](https://github.com/pmndrs/design-system/issues/101417)` to `[#141311](https://github.com/pmndrs/design-system/issues/141311)`. `THEME_SCHEME` is gone; `THEME_NEUTRAL`, `THEME_NEUTRAL_VARIANT` and `THEME_ERROR` are new, each a seed read the same way as `THEME_PRIMARY`.
  
  The palette is Material Theme Builder's output with nothing redrawn on top, so `builder(pmndrsMtb)` or `<Mtb>` at runtime renders exactly what the baked `md3` ships, and the Figma tokens follow.
  
  Color match moves other roles too:
  
  - Containers take their seed's hex, or a shade of it where the light scheme needs a darker one: light `primary-container` and `lime-container` are the lime `#caf543`, `teal-container` `#00f7a3`, `cyan-container` `#2bdcf6`, `orange-container` `#ffc043`; light `error-container` / `red-container` are `#da2b66` and `purple-container` `#b833da`, against `#ff4d82` and `#d956f9` in dark. Their on-container colours are re-picked to match, so `on-error-container` is now `#fffbff` in light.
  - In dark mode `primary`, `tertiary`, `lime` and `yellow` are `#ffffff`, and `teal`, `cyan` and `orange` near-white tints.
  - Secondary and tertiary follow the lime: secondary is an olive, tertiary a vivid green.
  - As in Material Theme Builder, custom colours keep their standard-contrast roles at medium and high contrast; only the core roles move. The bake is standard contrast, so it is unaffected.

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
