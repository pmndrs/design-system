/**
 * Generates `registry.json` from `registry.config.mjs`.
 *
 * `registry.json` is what GitHub-based resolution reads, so it has to be
 * committed — but 252 of its lines are a computed palette, and the rest is
 * config plus two long `docs` strings. Written by hand, all three were worse
 * for sharing a file: the config was buried, the docs were single-line escaped
 * JSON, and the palette could be edited out of sync with the seed it came from.
 *
 * So each part lives in its natural form and this assembles them:
 *
 *   registry.config.mjs        item metadata, the shadcn remap
 *   registry/<name>/docs.md    the `docs` field, as markdown
 *   registry/md3-base/md3.ts   the seed the palette is computed from
 *
 * The palette itself is never stored anywhere but the output. Change the seed,
 * run this, and the 252 declarations follow.
 *
 * `--check` asserts the output is current without writing — that is what `lgtm`
 * runs, so a seed change that skipped the rebuild fails rather than shipping.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { builder } from 'material-theme-builder'
import { items, registry, version } from '../registry.config.mjs'
import { pmndrsMtb } from '../registry/md3-base/md3.ts'

const check = process.argv.includes('--check')
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
 * That is deliberate, and worth not undoing: the two do not agree. `toJson()`
 * returns 90 tonal entries where the CSS has 168, omits the error palette
 * entirely, and 44 of the 90 it shares differ — `primary-40` is `#006b5a` there
 * against `#086b5a` here, and the gap widens up the ramp. `toCss()` is what
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
 */
function bakePalette() {
  const { source, ...options } = pmndrsMtb
  const { ':root': light, '.dark': dark } = parseBlocks(builder(source, options).toCss())
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

/** @returns the paths whose content is not what this build would write. */
function reconcile(outputs) {
  const stale = []
  for (const [url, next] of outputs) {
    if (readFileSync(url, 'utf8') === next) continue
    stale.push(url.pathname.replace(root.pathname, ''))
    if (!check) writeFileSync(url, next)
  }
  return stale
}

const outputs = [[registryUrl, JSON.stringify(built, null, 2) + '\n']]
for (const doc of docs) {
  const url = new URL(doc, import.meta.url)
  outputs.push([url, readFileSync(url, 'utf8').replace(installRef, `pmndrs/design-system/$1#${version}`)])
}

const counts = `${Object.keys(palette[':root']).length} light, ${Object.keys(palette['.dark']).length} dark`
const stale = reconcile(outputs)

if (!stale.length) {
  console.log(`✔ ${version} is current everywhere (${pmndrsMtb.source}, ${counts})`)
} else if (check) {
  console.error(`✖ out of date with registry.config.mjs: ${stale.join(', ')}`)
  console.error('  Run `npm run build` and commit the result.')
  process.exit(1)
} else {
  console.log(`✔ built ${stale.join(', ')} at ${version} (${pmndrsMtb.source}, ${counts})`)
}
