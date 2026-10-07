/**
 * Generates `registry.json`.
 *
 * `registry.json` is what GitHub-based resolution reads, so it has to be
 * committed — but 252 of its lines are a computed palette, and the rest is
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
 * run this, and the 252 declarations follow.
 *
 * `figma/*.tokens.json` is the same palette for the other half of the team, and
 * is generated here for the same reason: one seed, or designers and engineers
 * drift.
 *
 * Asserting the committed files are current is `build.test.mjs`'s job — it reads
 * the `outputs` exported here, so a seed change that skipped the rebuild fails
 * rather than shipping, and the check cannot drift from what this writes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { builder } from 'material-theme-builder'
import pkg from '../package.json' with { type: 'json' }
import { pmndrsMtb } from '../registry/md3-base/md3.ts'

/**
 * Refs are not inherited, so a cross-item dependency carries its own — and it
 * has to be *this* version, not a frozen one. Derived from package.json so the
 * changesets bump reaches it; `npm run version` rebuilds, and `check-build`
 * fails if it didn't.
 */
const version = `v${pkg.version}`

const registry = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'pmndrs',
  homepage: 'https://github.com/pmndrs/design-system',
}

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
      "The MD3 colour layer without any colours: the package's Tailwind plugin, its shadcn remap, and the pmndrs seed. Install this only if you compute the palette yourself — otherwise install `md3`, which supplies one.",
    author: 'pmndrs',
    dependencies: ['material-theme-builder@^5.0.0'],
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
     */
    css: {
      "@plugin 'material-theme-builder/tailwind'": {},
      "@import 'material-theme-builder/shadcn.css'": {},
    },
  },
  {
    name: 'md3',
    type: 'registry:lib',
    title: 'MD3 colours',
    description:
      'The pmndrs Material Design 3 colour layer. Additive to the stock shadcn tokens — blocks use `bg-primary` by default and reach for `bg-surface-dim` only where shadcn has no equivalent. Nothing to mount.',
    author: 'pmndrs',
    registryDependencies: [`pmndrs/design-system/md3-base#${version}`],
    palette: true,
  },
]

const registryUrl = new URL('../registry.json', import.meta.url)

/**
 * Prose that quotes an install address, which is a version — so it goes stale
 * on every release unless something rewrites it. These are the files where a
 * wrong ref would send someone to the wrong tag; the changeset markdown is
 * history and stays as written.
 */
const docs = ['../README.md', '../.changeset/README.md']
const installRef = /pmndrs\/design-system\/(md3|md3-base)#v\d+\.\d+\.\d+/g

/**
 * `toCss()` emits one flat `:root` and one flat `.dark` block, so this reads it
 * back rather than using the structured `toJson()`.
 *
 * That is deliberate, and worth not undoing: the two do not agree. Re-measured
 * on 5.0.0 — `toJson()` returns 90 tonal entries where the CSS has 217, omits the
 * error palette entirely, and 74 of the 90 it shares differ, not subtly:
 * `primary-40` is `#54606B` there against `#266389` here. `toCss()` is what
 * `<Mtb>` injects at runtime, and the bake has to stay interchangeable with it:
 * a site that reseeds overrides these declarations with that output, so the two
 * must be computed the same way.
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
 */
const { source, ...options } = pmndrsMtb
const theme = builder(source, options)

function bakePalette() {
  const { ':root': light, '.dark': dark } = parseBlocks(theme.toCss())
  if (!light || !dark) throw new Error('toCss() no longer emits `:root` and `.dark`')

  // The 168 `--md-ref-palette-*` tonal shades are scheme-independent, so `.dark`
  // re-emits them unchanged. `.dark` and `:root` both match `<html>`, so
  // anything not restated there keeps its `:root` value — carry only what differs.
  return {
    ':root': light,
    '.dark': Object.fromEntries(Object.entries(dark).filter(([k, v]) => light[k] !== v)),
  }
}

// Into `css`, and never `cssVars`: shadcn derives an `@theme inline` entry from
// every cssVar it is handed, so these would also land as 252 junk Tailwind theme
// names — and it builds their references by prefixing `--`, which on an
// already-prefixed name yields `var(----md-ref-palette-primary-40)`.
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
for (const doc of docs) {
  const url = new URL(doc, import.meta.url)
  outputs.push([url, readFileSync(url, 'utf8').replace(installRef, `pmndrs/design-system/$1#${version}`)])
}

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
 * `toCss()` sharing a context, so it holds by construction; the `toJson()`
 * divergence documented above is the reminder of what it would cost to lose it.
 */
for (const [name, tokens] of Object.entries(theme.toFigmaTokens())) {
  outputs.push([new URL(`../figma/${name}`, import.meta.url), JSON.stringify(tokens, null, 2) + '\n'])
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
