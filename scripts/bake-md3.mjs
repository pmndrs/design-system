/**
 * Bakes the pmndrs palette into `registry.json` as static CSS variables.
 *
 * Why bake at all: `material-theme-builder` computes the palette in JavaScript,
 * so `--md-sys-color-*` only exists once something mounts `<Mtb>` or emits
 * `toCss()`. The CLI cannot edit a consumer's root layout, so that step is a
 * printed instruction — and until it is followed, every variable the item's
 * remap points at is undefined. That does not degrade gracefully: the remap
 * overrides the stock shadcn tokens, so a missed instruction takes down the
 * *host app's* whole palette, silently, with no error from Tailwind or the
 * browser.
 *
 * Baking the default seed removes the prerequisite instead of documenting it.
 * Install the item and the colours are simply there. `<Mtb>` becomes what it
 * should always have been: the opt-in for a site that reseeds, whose absence
 * can no longer break anything.
 *
 * The seed is read from the registry item itself, with no `THEME_*` env set, so
 * this bakes the pmndrs default and `registry/md3/md3.ts` stays the one source
 * of truth for it.
 *
 * Run with `--check` to assert the bake is current without writing (this is
 * what `lgtm` does); run bare to regenerate after changing the seed.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { builder } from 'material-theme-builder'
import { pmndrsMtb } from '../registry/md3/md3.ts'

const check = process.argv.includes('--check')
const registryUrl = new URL('../registry.json', import.meta.url)

/** `toCss()` emits one `:root` and one `.dark` block, in declaration order. */
function parseBlock(css, selector) {
  const block = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find((m) => m[1].trim() === selector)
  if (!block) throw new Error(`material-theme-builder emitted no \`${selector}\` block`)

  return Object.fromEntries(
    block[2]
      .split(';')
      .map((decl) => decl.trim())
      .filter(Boolean)
      .map((decl) => {
        const colon = decl.indexOf(':')
        return [decl.slice(0, colon).trim(), decl.slice(colon + 1).trim()]
      })
  )
}

const { source, ...options } = pmndrsMtb
const css = builder(source, options).toCss()

const light = parseBlock(css, ':root')
const dark = parseBlock(css, '.dark')

// The 168 `--md-ref-palette-*` tonal shades are scheme-independent, so `.dark`
// re-emits them unchanged. `.dark` and `:root` both match `<html>`, so anything
// not restated there keeps its `:root` value — carry only what actually differs.
const darkOverrides = Object.fromEntries(
  Object.entries(dark).filter(([name, value]) => light[name] !== value)
)

const registry = JSON.parse(readFileSync(registryUrl, 'utf8'))
const item = registry.items.find((candidate) => candidate.name === 'md3')
if (!item) throw new Error('registry.json has no `md3` item')

// `md3` carries nothing but the palette; the mapping and the remap it needs come
// from `md3-base` through `registryDependencies`. That split is what lets a site
// which computes its own palette install the plumbing alone, instead of
// committing 252 generated declarations it immediately overrides.
//
// Into `css`, which the installer writes verbatim, and not `cssVars`: shadcn
// derives an `@theme inline` entry from every cssVar it is handed, so these
// would also land as 252 junk Tailwind theme names — and it builds their
// references by prefixing `--`, which on an already-prefixed name yields
// `var(----md-ref-palette-primary-40)`.
item.css = { ':root': light, '.dark': darkOverrides }

const next = JSON.stringify(registry, null, 2) + '\n'
const current = readFileSync(registryUrl, 'utf8')
const counts = `${Object.keys(light).length} light, ${Object.keys(darkOverrides).length} dark`

if (next === current) {
  console.log(`✔ registry.json carries the current bake of ${source} (${counts})`)
} else if (check) {
  console.error(`✖ registry.json is out of date with the ${source} seed`)
  console.error('  Run `npm run bake` and commit the result.')
  process.exit(1)
} else {
  writeFileSync(registryUrl, next)
  console.log(`✔ baked ${source} into registry.json (${counts})`)
}
