/**
 * Generates `registry.json`.
 *
 * `registry.json` is what GitHub-based resolution reads, so it has to be
 * committed — but most of its lines are a computed palette, and the rest is
 * item metadata plus two long `docs` strings. Written by hand, all three were
 * worse for sharing a file: the metadata was buried, the docs were single-line
 * escaped JSON, and the palette could be edited out of sync with the seed it
 * came from.
 *
 * So each part lives in its natural form and this assembles them:
 *
 *   the authored half below     item metadata
 *   registry/<name>/docs.md     the `docs` field, as markdown
 *   registry/md3-base/md3.ts    the seed the palette is computed from
 *
 * The palette itself is never stored anywhere but the output. Change the seed,
 * run this, and every declaration follows.
 *
 * `figma/*.tokens.json` is the same palette for the other half of the team, and
 * is generated here for the same reason: one seed, or designers and engineers
 * drift.
 *
 * The brand book, `artifact/README.md`, is generated into the docs site's
 * Guidelines page and the `guidelines` item's `Guidelines.md` here, for the
 * same reason again: written once, it cannot say two things.
 *
 * The getting-started page lists these items next to the other pmndrs repos' —
 * a catalog generated here so its install refs follow the version too; how the
 * other repos' get in is `catalog.mjs`'s story.
 *
 * Asserting the committed files are current is `build.test.mjs`'s job — it reads
 * the `outputs` exported here, so a seed change that skipped the rebuild fails
 * rather than shipping, and the check cannot drift from what this writes.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { builder } from 'material-theme-builder'
import pkg from '../package.json' with { type: 'json' }
import { pmndrsMtb } from '../registry/md3-base/md3.ts'
import { fill, stripArtifactOnly } from './brand-book.mjs'
import { externalUrl, pageUrl, writeCatalog } from './catalog.mjs'
import { foundationStyles, foundationVariables } from './foundation-tokens.mjs'
import { readFoundations } from './foundations.mjs'
import { hostedUrl } from './hosted-registry.mjs'
import { readRemap, tailwindColors } from './remap.mjs'
import { rewriteV0Links, sansFont, v0GlobalsCss } from './v0.mjs'

/**
 * Refs are not inherited, so a cross-item dependency carries its own — and it
 * has to be *this* version, not a frozen one. Derived from package.json so the
 * changesets bump reaches it; `npm run version` rebuilds, and `build.test.mjs`
 * (in `npm run lgtm`) fails if it didn't.
 */
const version = `v${pkg.version}`

/**
 * The foundations pages' values: the base radius the `preset` and `v0` items
 * carry, and the Figma foundation tokens below.
 */
const foundations = readFoundations()

/**
 * The `font-mono` item's font, which the `v0` stylesheet names too.
 */
const fontMono = {
  /**
   * What `@fontsource-variable/inconsolata` registers, which is what this
   * names outside Next — shadcn's own `font-inter` writes
   * `'Inter Variable', sans-serif` the same way. A bare `Inconsolata`
   * renders only where the font is installed locally. `next/font` reads
   * `import` instead, so Next is unaffected.
   */
  family: "'Inconsolata Variable', monospace",
  provider: 'google',
  import: 'Inconsolata',
  variable: '--font-mono',
  dependency: '@fontsource-variable/inconsolata',
  /**
   * Mandatory on Next: shadcn writes it into the `next/font/google` call, and
   * `next/font` preloads by default, so without a subset
   * `next build --webpack` fails with "Preload is enabled but no subsets were
   * specified" (Turbopack builds, but preloads nothing). It only selects what
   * is preloaded: every unicode range is still self-hosted.
   * `registry.test.mjs` holds it.
   */
  subsets: ['latin'],
  /**
   * Mandatory, not cosmetic: for `--font-mono` shadcn defaults a missing
   * selector to `html`, and on Next the mono class then replaces
   * `font-sans` on `<html>` — the whole site turns monospace.
   * `registry.test.mjs` holds it.
   */
  selector: 'code, kbd, samp, pre',
}

const registry = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'pmndrs',
  homepage: 'https://github.com/pmndrs/design-system',
}

/**
 * The `logo` item's files, which the `v0` item ships too: see `logo` below.
 */
const logoFiles = ['logo_complete', 'logo_idle', 'logo_animated', 'logo_loading'].map((logo) => ({
  path: `docs/assets/${logo}.svg`,
  type: 'registry:file',
  target: `~/public/pmndrs/${logo}.svg`,
}))

/**
 * The `guidelines` item's file, which the `v0` item ships too. Generated below
 * from the brand book, like the Guidelines page, so it cannot say something
 * the page does not. `guidelines/Guidelines.md` at the project root is the one
 * path Figma Make reads.
 */
const guidelinesFiles = [
  {
    path: 'registry/guidelines/Guidelines.md',
    type: 'registry:file',
    target: '~/guidelines/Guidelines.md',
  },
]

/**
 * `docs` comes from `registry/<name>/docs.md`, and `palette: true` means the
 * build fills `css` with the baked `:root` / `.dark` blocks.
 */
const items = [
  {
    name: 'md3-base',
    type: 'registry:lib',
    title: 'MD3 plumbing',
    description:
      "The MD3 colour layer without any colours: the package's Tailwind plugin, its shadcn remap, and the pmndrs seed. Install this only if you compute the palette yourself — otherwise install `theme`, which supplies one.",
    author: 'pmndrs',
    dependencies: ['material-theme-builder@^5.2.0'],
    files: [{ path: 'registry/md3-base/md3.ts', type: 'registry:lib' }],
    /**
     * Two lines the package answers for, rather than copies of what it ships.
     *
     * `shadcn.css` is the remap onto MD3 roles. Since v4 its selectors are
     * doubled (`:root:root`), so it outranks shadcn's own blocks wherever the
     * installer lands the `@import` — which is what lets it be an import here
     * rather than 31 declarations kept in step by hand.
     *
     * The Tailwind mapping is the `@plugin`, not the stylesheet of the same
     * name. Both emit the same `--color-*` map, but a plugin contributes
     * *defaults*, so shadcn's own `@theme inline` keeps the three names they
     * collide on (`background`, `primary`, `secondary`) whatever the order.
     * The stylesheet wins those instead when it lands after shadcn's block, and
     * `bg-secondary` silently stops being the container colour — measured on a
     * scratch app, `#d3e5f5` becomes `#50606e`. Same trade as `:root:root`
     * above: order stops being load-bearing.
     *
     * It is also where a consumer names custom colours, which is why the docs
     * point at this line — see `registry/md3-base/md3.ts`.
     *
     * The seed's own `customColors` cannot be named here, though. shadcn's
     * `update-css` has a dedicated `@plugin` branch that reads the key and
     * never the value (checked on 4.18: it writes `@plugin "…";` whatever
     * object sits under it), so a `{ 'custom-colors': 'lime, teal, …' }` body
     * would be silently dropped. The roles still land in `theme`'s bake; the body
     * that turns them into utilities is in `docs.md`, for the consumer to add.
     */
    css: {
      "@plugin 'material-theme-builder/tailwind'": {},
      "@import 'material-theme-builder/shadcn.css'": {},
    },
  },
  /**
   * Named after its role, not the typeface, so a change of font is not a
   * breaking rename.
   *
   * Its own item because shadcn's schema allows a `font` object on
   * `registry:font` only — it cannot ride inside `theme`.
   */
  {
    name: 'font-mono',
    type: 'registry:font',
    title: 'pmndrs mono font',
    description:
      'Inconsolata as `--font-mono`, so `font-mono` resolves to the pmndrs monospace — applied to `code, kbd, samp, pre` only. Through `next/font/google` on Next, through `@fontsource-variable/inconsolata` elsewhere.',
    author: 'pmndrs',
    font: fontMono,
  },
  /**
   * The single documented install target: the pmndrs palette, plus everything
   * it needs.
   */
  {
    name: 'theme',
    type: 'registry:lib',
    title: 'pmndrs theme',
    description:
      'The pmndrs theme: the Material Design 3 palette, the colour machinery under it (`md3-base`) and the mono font (`font-mono`). Additive to the stock shadcn tokens — blocks use `bg-primary` by default and reach for `bg-surface-dim` only where shadcn has no equivalent. Nothing to mount.',
    author: 'pmndrs',
    registryDependencies: [`pmndrs/design-system/md3-base#${version}`, `pmndrs/design-system/font-mono#${version}`],
    palette: true,
  },
  /**
   * The poimandres preset as an item, the theme with it: what
   * `npx shadcn@latest init <hosted url>` starts a project from, so a consumer
   * never needs the preset code.
   *
   * A `registry:base`, not a `registry:style`: a style carries no preset
   * choices, and `shadcn init` with one falls back to `new-york` (measured on
   * 4.18). A base carries them in `config`, which init merges into
   * `components.json`. Modelled on the item shadcn itself serves for the
   * preset code (`ui.shadcn.com/init?…&preset=b1VlIttI`): its `config`,
   * `dependencies`, `registryDependencies` and `css`, with `extends: 'none'`
   * so the stock style does not install under it.
   *
   * What it leaves out is that item's colours: literal `cssVars` land in
   * `:root` after the remap's `@import` and override it, so the colours stay
   * `theme`'s. What else it has in `cssVars` stays, none of it a colour
   * value, because shadcn writes it from there only: `radius` (and the
   * `--radius-*` scale it derives from it), the heading font, and the
   * `@theme inline` mapping it would have derived from the colours.
   * `registry.test.mjs` holds both rules, and the choices to `preset.json`.
   */
  {
    name: 'preset',
    type: 'registry:base',
    title: 'poimandres preset',
    description:
      'The poimandres shadcn preset and the pmndrs theme in one item, for `shadcn init`: style `base-luma`, Inter, the default radius, lucide icons, and the Material Design 3 palette with the mono font. Starts a project that already looks like pmndrs, no preset code needed.',
    author: 'pmndrs',
    extends: 'none',
    config: {
      style: 'base-luma',
      tailwind: { baseColor: 'neutral' },
      iconLibrary: 'lucide',
      rtl: false,
      menuColor: 'default',
      menuAccent: 'subtle',
      // The namespace, declared on the way: `shadcn add @pmndrs/logo` works next.
      registries: { '@pmndrs': `${hostedUrl}{name}.json` },
    },
    dependencies: ['shadcn@latest', 'class-variance-authority', 'cn', 'tw-animate-css', '@base-ui/react', 'lucide-react'],
    registryDependencies: ['utils', 'font-inter', `pmndrs/design-system/theme#${version}`],
    cssVars: {
      theme: {
        '--font-heading': 'var(--font-sans)',
        /**
         * What shadcn would have derived from the colours left out: the
         * Tailwind colour of each variable the remap sets (`bg-card`,
         * `border-border`…). Without it the `@apply border-border` below fails
         * the Tailwind build; the MD3 plugin maps the MD3 role names only.
         * Here and not in `css`, which cannot put a declaration in
         * `@theme inline`.
         */
        ...Object.fromEntries(tailwindColors(readRemap())),
      },
      light: { radius: foundations.radius.base },
    },
    css: {
      '@import "tw-animate-css"': {},
      '@import "shadcn/tailwind.css"': {},
      '@layer base': {
        '*': { '@apply border-border outline-ring/50': {} },
        body: { '@apply bg-background text-foreground': {} },
      },
    },
  },
  /**
   * The two items below ship files rather than code: `registry:file`, which
   * shadcn copies byte for byte to its `target` — no import rewriting, no
   * formatting. Nothing in `registry.json` inlines them: an install from a
   * GitHub address fetches each `path` from raw.githubusercontent.com at the
   * pinned ref, the way it fetches `md3.ts`.
   *
   * Text only, for the same reason: the CLI reads every file as a string, so a
   * PNG would arrive mangled: the logo ships as SVG only.
   *
   * Every `target` starts with `~/`, which is the project root. A bare
   * `public/…` is not: in an app with a `src/` directory — what
   * `create-next-app --src-dir` makes, and what the docs tell people to run —
   * shadcn puts it under `src/public/…`, where Next serves nothing. Measured on
   * shadcn 4.18; `registry.test.mjs` rejects any target without the `~/`.
   */
  {
    name: 'logo',
    type: 'registry:item',
    title: 'pmndrs logo',
    description:
      'The pmndrs logo as SVG — complete, idle, animated and loading — into `public/pmndrs/`, so `/pmndrs/logo_loading.svg` is a plain image URL. The animations are CSS inside the files, with a reduced-motion fallback.',
    author: 'pmndrs',
    /**
     * The sources are the Assets page's own previews, not copies: pmndrs/docs
     * resolves a relative image against the docs folder of the branch on
     * GitHub (`MDX_BASEURL`), and clamps `..` at that folder, so an SVG that
     * lived under `registry/` could not be shown on the page. One file serves
     * both, and the installed name is the one the page lists.
     */
    files: logoFiles,
  },
  {
    name: 'figma-tokens',
    type: 'registry:item',
    title: 'pmndrs Figma tokens',
    description:
      'The pmndrs design tokens for Figma, into `design/tokens/pmndrs/`: the palette, light and dark, and the type, spacing, radius and motion values, as variables Figma imports natively; the text and shadow styles, as a file Tokens Studio reads. The same values `theme` bakes into CSS and the docs pages list.',
    author: 'pmndrs',
    /**
     * The `figma/*.tokens.json` this build writes below, so `build.test.mjs`
     * already holds them current; this only gives them an install address.
     *
     * At the root, not in `public/`: tokens are an input to a design tool or a
     * token pipeline, not something to serve. Under `design/tokens/`, where
     * such a pipeline looks, and in a `pmndrs/` folder of their own, as the
     * logo is, so a project's own tokens sit beside them rather than under
     * them. The file names stay the ones the README and the docs link to; the
     * mode each one is carries in the file itself (`com.figma.modeName`).
     */
    files: ['Light', 'Dark', 'Foundations', 'Styles'].map((name) => ({
      path: `figma/${name}.tokens.json`,
      type: 'registry:file',
      target: `~/design/tokens/pmndrs/${name}.tokens.json`,
    })),
  },
  {
    name: 'guidelines',
    type: 'registry:item',
    title: 'pmndrs guidelines',
    description:
      'The pmndrs brand book as `guidelines/Guidelines.md`: how to use the colour layer, type, spacing, components, the logo and the voice. The file Figma Make reads, and one to point Claude or Cursor at.',
    author: 'pmndrs',
    files: guidelinesFiles,
  },
  /**
   * What an "Open in v0" link opens. v0 drops `css`, `cssVars` and
   * namespaces, and resolves no GitHub address, so nothing above reaches it:
   * this item carries everything as files of v0's Next.js project instead.
   * The `globals.css`, generated below with every colour resolved to a
   * literal; a layout and a starter page, so the preview shows the theme as
   * soon as it opens rather than nothing; and the `logo` and `guidelines`
   * items' own files, so v0 has the mark and the brand book to work from.
   * The shape is shadcn's own Open in v0 payload's: `registry:file`s at the
   * project's paths, which is why no target has a `~/` (v0 reads them, not the
   * CLI).
   */
  {
    name: 'v0',
    type: 'registry:item',
    title: 'pmndrs theme for v0',
    description:
      'The pmndrs theme as a v0 project, for Open in v0: an `app/globals.css` with the shadcn colours and the Material Design 3 roles resolved to the pmndrs palette, light and dark, Inter and Inconsolata, and the default radius; a layout and a starter page; the logo in `public/pmndrs/`; and the brand book as `guidelines/Guidelines.md`. In your own project, install `theme` or `preset` instead.',
    author: 'pmndrs',
    dependencies: [
      'shadcn@latest',
      'tw-animate-css',
      ...[sansFont(foundations), fontMono].map(({ dependency }) => `${dependency}@${pkg.devDependencies[dependency]}`),
    ],
    files: [
      { path: 'registry/v0/globals.css', target: 'app/globals.css' },
      { path: 'registry/v0/app/layout.tsx', target: 'app/layout.tsx' },
      { path: 'registry/v0/app/page.tsx', target: 'app/page.tsx' },
      ...[...logoFiles, ...guidelinesFiles].map(({ path, target }) => ({ path, target: target.replace(/^~\//, '') })),
    ].map((file) => ({ ...file, type: 'registry:file' })),
  },
]

const registryUrl = new URL('../registry.json', import.meta.url)

/**
 * Prose that quotes an install address, which is a version — so it goes stale
 * on every release unless something rewrites it. These are the files where a
 * wrong ref would send someone to the wrong tag: the READMEs, and every page of
 * the docs site. The changeset markdown is history and stays as written.
 */
const docsDir = new URL('../docs/', import.meta.url)
/** The Guidelines page, generated whole from the brand book below. */
const guidelinesPageUrl = new URL('guidelines/introduction.mdx', docsDir)
const docPages = readdirSync(docsDir, { recursive: true })
  .filter((path) => path.endsWith('.mdx'))
  .filter((path) => new URL(path, docsDir).href !== guidelinesPageUrl.href)
  .sort()
  .map((path) => new URL(path, docsDir))
const docs = [new URL('../README.md', import.meta.url), new URL('../.changeset/README.md', import.meta.url), ...docPages]

/**
 * `pmndrs/design-system/<item>#v<semver>`, for this repo's items only — an
 * address into another repo (`pmndrs/docs/…#v4.22.0`) is never touched.
 */
const installRef = new RegExp(`pmndrs/design-system/(${items.map(({ name }) => name).join('|')})#v\\d+\\.\\d+\\.\\d+`, 'g')

/**
 * `toCss()` emits one flat `:root` and one flat `.dark` block, so this reads it
 * back rather than using the structured `toJson()`.
 *
 * Since 5.2.0 their colours agree, but `toJson()` has neither the custom
 * colours' roles nor the `var()` aliases, and `toCss()` is what `<Mtb>` injects
 * at runtime: the bake has to stay interchangeable with it.
 *
 * The assertions below are the guard the regex needs — if the package ever
 * changes its emitted shape, this fails loudly instead of baking a partial
 * palette.
 */
function parseBlocks(css) {
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
  if (blocks.length !== 2) {
    throw new Error(`expected 2 CSS blocks from toCss(), got ${blocks.length}`)
  }

  return Object.fromEntries(
    blocks.map(([, selector, body]) => {
      const decls = Object.fromEntries(
        body
          .split(';')
          .map((decl) => decl.trim())
          .filter(Boolean)
          .map((decl) => {
            const colon = decl.indexOf(':')
            return [decl.slice(0, colon).trim(), decl.slice(colon + 1).trim()]
          })
      )

      const stray = Object.keys(decls).filter((name) => !name.startsWith('--md-'))
      if (stray.length) throw new Error(`unexpected declarations in ${selector}: ${stray}`)
      if (!Object.keys(decls).length) throw new Error(`no declarations in ${selector}`)

      return [selector.trim(), decls]
    })
  )
}

/**
 * The pmndrs default, so no `THEME_*` is read: those are a consumer's to set,
 * and baking one deployment's environment into the published item would be a
 * good way to ship a surprise.
 *
 * One theme for both outputs, CSS and Figma — they are the same palette and have
 * no business being computed twice.
 *
 * And nothing on top of it: what ships is `builder(pmndrsMtb)` as it comes, so a
 * site that computes the palette at runtime with the same seed gets the same
 * colours. `registry.test.mjs` holds the bake to that.
 */
const { source, ...options } = pmndrsMtb
const theme = builder(source, options)

function bakePalette() {
  const blocks = parseBlocks(theme.toCss())
  if (!blocks[':root'] || !blocks['.dark']) throw new Error('toCss() no longer emits `:root` and `.dark`')
  const light = blocks[':root']
  const dark = blocks['.dark']

  // The `--md-ref-palette-*` tonal shades are scheme-independent, so `.dark`
  // re-emits them unchanged. `.dark` and `:root` both match `<html>`, so
  // anything not restated there keeps its `:root` value — carry only what differs.
  return {
    ':root': light,
    '.dark': Object.fromEntries(Object.entries(dark).filter(([k, v]) => light[k] !== v)),
  }
}

// Into `css`, and never `cssVars`: shadcn derives an `@theme inline` entry from
// every cssVar it is handed, so these would also land as hundreds of junk
// Tailwind theme names — and it builds their references by prefixing `--`,
// which on an already-prefixed name yields `var(----md-ref-palette-primary-40)`.
const palette = bakePalette()

const built = {
  ...registry,
  items: items.map(({ palette: needsPalette, ...item }) => ({
    ...item,
    ...(needsPalette ? { css: palette } : {}),
    docs: readFileSync(new URL(`../registry/${item.name}/docs.md`, import.meta.url), 'utf8').trimEnd(),
  })),
}

const root = new URL('../', import.meta.url)

/**
 * Every file this build owns, as `[url, content]`. Exported rather than written
 * on import: `build.test.mjs` asserts the committed copies against exactly these
 * strings, so there is one definition of what the output should be and no second
 * implementation of the comparison to keep in step.
 */
export const outputs = [[registryUrl, JSON.stringify(built, null, 2) + '\n']]

/**
 * The catalog of every pmndrs registry item, this repo's first — see
 * `catalog.mjs`. This repo's are read off `built`, so they carry this version
 * and whatever the items above say; the other repos' come from the committed
 * snapshot, so the build never touches the network.
 */
const external = JSON.parse(readFileSync(externalUrl, 'utf8'))
const registries = [{ repo: 'pmndrs/design-system', ref: version, items: built.items }, ...external]

const bumpInstallRefs = (text) => text.replace(installRef, `pmndrs/design-system/$1#${version}`)

// The Open in v0 links are rewritten too: a prompt names tokens, and each link is written once, in `v0.mjs`.
for (const url of docs) {
  let page = rewriteV0Links(bumpInstallRefs(readFileSync(url, 'utf8')))
  if (url.href === pageUrl.href) page = writeCatalog(page, registries)
  outputs.push([url, page])
}

/**
 * The brand book, `artifact/README.md`, as the docs site reads it: the
 * Guidelines page, right after Getting Started (`nav` sorts numerically, so
 * `0.5` sits between it and Colors without renumbering every page). Passages
 * marked artifact-only are dropped, and the placeholders are filled the way
 * `artifact.mjs` fills them, so the page, the artifact and `Guidelines.md`
 * say the same thing at the same versions.
 *
 * Written whole on every build rather than bumped in place, which is why it is
 * not one of the `docPages` above.
 *
 * Both copies open on `generatedFrom`, so an edit lands in the brand book and
 * not in an output the next build overwrites. On the page it is a YAML comment
 * in the frontmatter, which pmndrs/docs drops: an MDX comment would stay in the
 * body, and so in `llms-full.txt`.
 */
const brandBookPath = 'artifact/README.md'
const guidelines = fill(stripArtifactOnly(readFileSync(new URL(`../${brandBookPath}`, import.meta.url), 'utf8')), brandBookPath).trim()
const generatedFrom = `Generated from ${brandBookPath} by scripts/build.mjs: do not edit.`

outputs.push([
  guidelinesPageUrl,
  `---
# ${generatedFrom}
title: Guidelines
description: The do and don't of the pmndrs design system — colour, type, spacing, components, logo, iconography and voice.
nav: 0.5
---

${guidelines}
`,
])

/** The same text as the `guidelines` item installs it, with a title of its own in place of the frontmatter. */
outputs.push([
  new URL('../registry/guidelines/Guidelines.md', import.meta.url),
  `<!-- ${generatedFrom} -->\n\n# Poimandres design system guidelines\n\n${guidelines}\n`,
])

/** The `v0` item's stylesheet; what is in it is `v0.mjs`'s story. */
outputs.push([new URL('../registry/v0/globals.css', import.meta.url), v0GlobalsCss(palette, foundations, fontMono)])

/**
 * The palette as DTCG tokens: `Light` and `Dark` become two modes of one Figma
 * variable collection, and the roles stay aliased onto the tonal shades
 * (`"$value": "{ref.palette.Neutral.98}"`) exactly as `var()` does in the CSS.
 *
 * Committed, and 190 kB of it, for the reason the palette is: nothing here is
 * published to npm, so a tag is the only address a designer can be handed.
 *
 * These come off the same `theme` as the bake above — same `allPalettes`, same
 * merged colours — so what a designer picks in Figma is the hex the site
 * renders, not a close one. That is a property of `toFigmaTokens()` and
 * `toCss()` sharing a context, so it holds by construction.
 */
for (const [name, tokens] of Object.entries(theme.toFigmaTokens())) {
  outputs.push([new URL(`../figma/${name}`, import.meta.url), JSON.stringify(tokens, null, 2) + '\n'])
}

/**
 * The foundations beside the palette: type, spacing, radius, shadow and
 * motion, read off the docs pages that decide them. `Foundations` is the
 * variables file Figma imports natively, `Styles` the text and effect styles
 * Tokens Studio creates; why two shapes is `foundation-tokens.mjs`'s story.
 */
for (const [name, tokens] of [
  ['Foundations', foundationVariables(foundations)],
  ['Styles', foundationStyles(foundations)],
]) {
  outputs.push([new URL(`../figma/${name}.tokens.json`, import.meta.url), JSON.stringify(tokens, null, 2) + '\n'])
}

if (import.meta.main) {
  const written = []
  for (const [url, next] of outputs) {
    // Missing counts as stale rather than fatal — `figma/` is a directory this
    // creates, and deleting an output should be a way to regenerate it.
    if (existsSync(url) && readFileSync(url, 'utf8') === next) continue
    mkdirSync(new URL('./', url), { recursive: true })
    writeFileSync(url, next)
    written.push(url.pathname.replace(root.pathname, ''))
  }

  const counts = `${Object.keys(palette[':root']).length} light, ${Object.keys(palette['.dark']).length} dark`
  const summary = written.length ? `built ${written.join(', ')} at ${version}` : `${version} is current everywhere`

  console.log(`✔ ${summary} (${pmndrsMtb.source}, ${counts})`)
}
