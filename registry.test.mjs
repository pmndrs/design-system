/**
 * `registry.json` is generated, so most of it is already pinned: `check-build`
 * compares the output to what is committed, which fixes anything that is a pure
 * function of the inputs. Asserting those here would only restate the build.
 *
 * What `check-build` cannot catch is a bad *input*. Mistype a variable in the
 * shadcn remap, add a `cssVars` block, point a dependency at an item that does
 * not exist — rebuild, and the output is faithfully current and wrong. These
 * assert the coherence the generator never checks.
 *
 * Schema and `files[].path` existence belong to `shadcn registry validate`,
 * which covers both.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { builder } from 'material-theme-builder'
import registry from './registry.json' with { type: 'json' }
import { pmndrsMtb } from './registry/md3-base/md3.ts'

/** Every `--name: value` pair under an item's `css`, at any nesting depth. */
function declarations(css, found = []) {
  for (const [key, value] of Object.entries(css ?? {})) {
    if (typeof value === 'object') declarations(value, found)
    else if (key.startsWith('--')) found.push([key, value])
  }
  return found
}

const declared = registry.items.flatMap((item) => declarations(item.css))
const names = new Set(declared.map(([name]) => name))

/**
 * Registry-wide rather than per item, deliberately: `md3-base` is the layer
 * without colours, so its remap points at `--md-sys-color-*` that `md3` supplies
 * — or that a runtime `<Mtb>` injects. Only together do the references close.
 *
 * A dangling one is silent everywhere else. CSS drops the declaration, the
 * element keeps whatever it inherited, and the page renders looking plausible.
 */
test('every var() reference resolves to a variable the registry declares', () => {
  const dangling = declared.flatMap(([name, value]) =>
    [...value.matchAll(/var\(\s*(--[\w-]+)/g)]
      .map(([, reference]) => reference)
      .filter((reference) => !names.has(reference))
      .map((reference) => `${name} references ${reference}, which nothing declares`)
  )

  assert.deepEqual(dangling, [])
})

/**
 * shadcn derives an `@theme inline` entry from every `cssVars` it is handed, and
 * builds the reference by prefixing `--` — so an already-prefixed MD3 name lands
 * as `var(----md-ref-palette-primary-40)`, alongside 252 junk Tailwind theme
 * names. The palette belongs in `css`; this keeps it there.
 */
test('no item declares cssVars', () => {
  const offenders = registry.items.filter((item) => item.cssVars).map((item) => item.name)

  assert.deepEqual(offenders, [])
})

/**
 * A ref is not inherited, so a cross-item dependency carries its own address.
 * The version half is derived from package.json at build time; the item name is
 * hand-written, and resolves to a 404 at install time if it drifts.
 */
test('registryDependencies on this registry name items it defines', () => {
  const self = new URL(registry.homepage).pathname.slice(1)
  const own = new Set(registry.items.map((item) => item.name))

  const dangling = registry.items.flatMap((item) =>
    (item.registryDependencies ?? [])
      .filter((dependency) => dependency.startsWith(`${self}/`))
      .map((dependency) => dependency.slice(self.length + 1).split('#')[0])
      .filter((name) => !own.has(name))
  )

  assert.deepEqual(dangling, [])
})

/**
 * "The hex a designer picks is the hex the site renders" holds by construction
 * — the CSS and the Figma tokens come off one `builder()` — and this holds it by
 * test too: every Figma role, followed through its aliases, against the same
 * role in the baked CSS.
 */
test('every Figma role resolves to the hex the baked CSS gives it', () => {
  const css = registry.items.find((item) => item.name === 'md3').css
  const resolveCss = (block, name) => {
    let value = block[name] ?? css[':root'][name]
    for (let ref; (ref = value?.match(/^var\((--[\w-]+)\)$/)); ) value = block[ref[1]] ?? css[':root'][ref[1]]
    return value?.toLowerCase()
  }

  const mismatches = []
  for (const [mode, block] of [['Light', css[':root']], ['Dark', css['.dark']]]) {
    const tokens = JSON.parse(readFileSync(new URL(`./figma/${mode}.tokens.json`, import.meta.url), 'utf8'))
    const resolveFigma = (value) => {
      while (typeof value === 'string') value = value.slice(1, -1).split('.').reduce((node, key) => node[key], tokens).$value
      return value.hex.toLowerCase()
    }
    const walk = (node) => {
      if (node.$value && node.$extensions?.['css.variable']) {
        const name = node.$extensions['css.variable']
        const [figma, baked] = [resolveFigma(node.$value), resolveCss(block, name)]
        if (figma !== baked) mismatches.push(`${mode} ${name}: Figma ${figma}, CSS ${baked}`)
      } else if (typeof node === 'object') Object.values(node).forEach(walk)
    }
    walk(tokens.sys)
  }

  assert.deepEqual(mismatches, [])
})

/**
 * The bake is Material Theme Builder's output as it comes, with nothing redrawn
 * on top: a site that computes the palette at runtime from `pmndrsMtb` —
 * `builder()` or `<Mtb>` — renders every role in the same colour as the baked
 * `md3`. Compared resolved, through the `var()` aliases, so this pins what a
 * page shows rather than how the build happens to write it.
 *
 * `check-build` cannot catch a departure: it compares against what `build.mjs`
 * writes, so a step redrawing the palette there would be current and pass.
 */
test('the baked palette is what builder(pmndrsMtb) renders', () => {
  const css = registry.items.find((item) => item.name === 'md3').css
  const { source, ...options } = pmndrsMtb
  const runtime = Object.fromEntries(
    [...builder(source, options).toCss().matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => [
      selector.trim(),
      Object.fromEntries(
        body
          .split(';')
          .map((declaration) => declaration.trim())
          .filter(Boolean)
          .map((declaration) => [declaration.slice(0, declaration.indexOf(':')).trim(), declaration.slice(declaration.indexOf(':') + 1).trim()])
      ),
    ])
  )

  // `.dark` matches `<html>` along with `:root`, so a mode is `:root` with `.dark` on top.
  const resolve = (block, name) => {
    let value = block[name]
    for (let ref; (ref = value?.match(/^var\((--[\w-]+)\)$/)); ) value = block[ref[1]]
    return value?.toLowerCase()
  }
  const mismatches = []
  for (const [mode, baked, computed] of [
    ['light', css[':root'], runtime[':root']],
    ['dark', { ...css[':root'], ...css['.dark'] }, { ...runtime[':root'], ...runtime['.dark'] }],
  ]) {
    for (const name of new Set([...Object.keys(baked), ...Object.keys(computed)])) {
      const [got, want] = [resolve(baked, name), resolve(computed, name)]
      if (got !== want) mismatches.push(`${mode} ${name}: baked ${got}, builder() ${want}`)
    }
  }

  assert.deepEqual(mismatches, [])
})
