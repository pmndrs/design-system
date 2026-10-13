/**
 * The `v0` item and the files it ships, written by `build.mjs` through
 * `scripts/v0.mjs`. `build.test.mjs` holds the generated ones current; these
 * hold them to what they claim: the pmndrs colours, fonts and radius, under
 * the names a pmndrs project has, supplied as one stylesheet.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { mtbColors } from 'material-theme-builder/tailwind'
import registry from './registry.json' with { type: 'json' }
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { readFoundations } from './scripts/foundations.mjs'
import { hostedUrl } from './scripts/hosted-registry.mjs'
import { registersFamily } from './scripts/packages.mjs'
import { readRemap, tailwindColors } from './scripts/remap.mjs'
import { v0Link } from './scripts/v0.mjs'

/**
 * Open in v0 drops `css`, `cssVars` and namespaces, and resolves no GitHub
 * address (shadcn's Open in v0 docs; vercel/registry-starter and shadcn's own
 * create flow both ship the theme as a file). So the item it opens carries
 * everything as files of v0's Next.js project, and depends on nothing but
 * absolute URLs.
 */
const v0 = () => registry.items.find((item) => item.name === 'v0')
const fileAt = (target) => v0().files.find((file) => file.target === target)
const read = (target) => readFileSync(new URL(fileAt(target).path, import.meta.url), 'utf8')

test('the v0 item ships only the theme stylesheet and its dependencies', () => {
  const v0Item = v0()

  assert.ok(v0Item, 'no `v0` item')
  assert.equal(v0Item.type, 'registry:item')
  assert.deepEqual(
    v0Item.files.map(({ type, target }) => ({ type, target })),
    [{ type: 'registry:file', target: 'app/globals.css' }]
  )
  assert.equal(v0Item.css, undefined)
  assert.equal(v0Item.cssVars, undefined)
  const relative = (v0Item.registryDependencies ?? []).filter((dependency) => !dependency.startsWith('https://'))
  assert.deepEqual(relative, [])
})

/** The palette is installed once by its registry item and imported at its target. */
test('the v0 stylesheet imports the palette registry dependency', () => {
  assert.deepEqual(v0().registryDependencies, [`${hostedUrl}palette.json`])
  const palette = registry.items.find(({ name }) => name === 'palette')
  assert.equal(palette.files[0].target, '~/src/assets/pmndrs.css')
  assert.ok(read('app/globals.css').includes('@import "../src/assets/pmndrs.css";'))
  assert.doesNotMatch(read('app/globals.css'), /--md-(?:sys-color|ref-palette)-[\w-]+\s*:/)
})

/** The declarations of the top-level `selector { … }` block of a stylesheet. */
function block(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const body = css.match(new RegExp(`^${escaped} \\{([^}]*)\\}`, 'm'))?.[1]
  assert.ok(body, `no \`${selector}\` block`)
  return Object.fromEntries(
    body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => [
        declaration.slice(0, declaration.indexOf(':')).trim(),
        declaration.slice(declaration.indexOf(':') + 1).trim(),
      ])
  )
}

const globalsCss = () => read('app/globals.css')
const paletteCss = () => readFileSync(new URL('./registry/palette/palette.css', import.meta.url), 'utf8')
const schemeDeclarations = (selector) => ({
  ...block(paletteCss(), ':root'),
  ...block(paletteCss(), selector),
  ...block(globalsCss(), ':root'),
  ...block(globalsCss(), selector),
})

/**
 * The hex of every `--md-*` variable in a mode, from the Figma tokens, which
 * come off the palette by a different path than the CSS bake: the roles by
 * their `css.variable`, the tonal shades by palette name and tone
 * (`ref.palette.Neutral Variant.50` is `--md-ref-palette-neutral-variant-50`).
 */
function figmaHex(mode) {
  const tokens = JSON.parse(readFileSync(new URL(`./figma/${mode}.tokens.json`, import.meta.url), 'utf8'))
  const resolve = (node) => {
    let value = node.$value
    while (typeof value === 'string') value = value.slice(1, -1).split('.').reduce((n, key) => n[key], tokens).$value
    return value.hex.toLowerCase()
  }
  const hexOf = {}
  const walk = (node) => {
    if (node?.$value && node.$extensions?.['css.variable']) hexOf[node.$extensions['css.variable']] = resolve(node)
    else if (typeof node === 'object') Object.values(node).forEach(walk)
  }
  walk(tokens.sys)
  for (const [palette, tones] of Object.entries(tokens.ref.palette)) {
    for (const [tone, node] of Object.entries(tones)) {
      if (node?.$value) hexOf[`--md-ref-palette-${palette.toLowerCase().replace(/ /g, '-')}-${tone}`] = resolve(node)
    }
  }
  return hexOf
}

const modes = [
  ['Light', ':root'],
  ['Dark', '.dark'],
]

/** Resolve a variable against the declarations active in one colour scheme. */
function resolved(declared, name) {
  let value = declared[name]
  const seen = new Set([name])
  for (let ref; (ref = value?.match(/^var\((--[\w-]+)\)$/)); ) {
    assert.ok(!seen.has(ref[1]), `cyclic alias ${ref[1]}`)
    seen.add(ref[1])
    value = declared[ref[1]]
  }
  return value?.toLowerCase()
}

/** Shadcn aliases must resolve to the same colours as the Figma exports. */
test('the v0 stylesheet resolves shadcn colours in both schemes, including dark subtrees', () => {
  const css = globalsCss()
  for (const [mode, selector] of modes) {
    const hexOf = figmaHex(mode)
    const scheme = block(css, selector)
    const declared = schemeDeclarations(selector)
    for (const { name, role } of readRemap()) {
      assert.equal(scheme[name], `var(${role})`, `${mode} ${name}`)
      assert.equal(resolved(declared, name), hexOf[role], `${mode} ${name}`)
    }
  }
})

/**
 * What a pmndrs project's Tailwind gets from `theme`: shadcn's colours, and
 * everything the MD3 plugin maps once its body names the seed's custom colours
 * (`md3-base`'s docs) — `bg-primary-container`, `bg-lime-container`,
 * `bg-purple-500`. The three names both claim (`background`, `primary`,
 * `secondary`) stay shadcn's there, so they stay shadcn's here. Same names,
 * same variables, so what v0 writes runs unchanged in a pmndrs app.
 */
test('the v0 globals.css maps every colour utility a pmndrs project has, to the same variable', () => {
  const theme = block(globalsCss(), '@theme inline')
  const shadcn = Object.fromEntries(tailwindColors(readRemap()))
  const plugin = mtbColors({ customColors: pmndrsMtb.customColors.map(({ name }) => name) })
  const expected = { ...Object.fromEntries(Object.entries(plugin).map(([name, value]) => [`--color-${name}`, value])), ...shadcn }

  const mismatches = Object.entries(expected)
    .filter(([name, value]) => theme[name] !== value)
    .map(([name, value]) => `${name}: ${theme[name]}, a pmndrs project has ${value}`)
  assert.deepEqual(mismatches, [])
})

/**
 * Every MD3 variable resolves to the hex Figma has for it, light and
 * dark: every role, for code that names one (`var(--md-sys-color-surface-dim)`,
 * for example), and every tonal shade a utility above maps.
 */
test('the v0 globals.css resolves every MD3 role and mapped shade to the Figma colour', () => {
  const css = globalsCss()
  const mapped = [...Object.values(block(css, '@theme inline')).join(' ').matchAll(/var\((--md-[\w-]+)\)/g)].map(([, name]) => name)

  const mismatches = []
  for (const [mode, selector] of modes) {
    const hexOf = figmaHex(mode)
    const declared = schemeDeclarations(selector)
    const roles = Object.keys(hexOf).filter((name) => name.startsWith('--md-sys-color-'))
    for (const name of new Set([...roles, ...mapped])) {
      if (!hexOf[name] || resolved(declared, name) !== hexOf[name]) mismatches.push(`${mode} ${name}: ${declared[name]}, Figma has ${hexOf[name]}`)
    }
  }
  assert.deepEqual(mismatches, [])
})

/**
 * v0 reads no `registry:font`, so the fonts come with the file: imported from
 * their Fontsource packages, which the item installs, under the family each
 * one registers. The radius is the Radius page's.
 */
test('the v0 globals.css sets the radius and both fonts, and declares every variable it uses', () => {
  const css = globalsCss()
  const theme = block(css, '@theme inline')
  const root = block(css, ':root')

  assert.equal(root['--radius'], readFoundations().radius.base)
  for (const [variable, dependency] of [
    ['--font-sans', '@fontsource-variable/inter'],
    ['--font-mono', '@fontsource-variable/inconsolata'],
  ]) {
    assert.ok(css.includes(`@import "${dependency}";`), `no import of ${dependency}`)
    assert.ok(
      v0().dependencies.some((name) => name.replace(/(.)@[^@/]*$/, '$1') === dependency),
      `${dependency} not installed`
    )
    assert.ok(registersFamily(dependency, theme[variable] ?? ''), `${variable}: ${theme[variable]}`)
  }

  const combined = paletteCss() + '\n' + css
  const declared = new Set([...combined.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name))
  const dangling = [...combined.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name).filter((name) => !declared.has(name))
  assert.deepEqual(dangling, [])
})

/** The docs hand out the generated Open in v0 link to the hosted theme item. */
test('the README and the Open in v0 page hand out the Open in v0 link, as generated', () => {
  assert.equal(new URL(v0Link).searchParams.get('url'), `${hostedUrl}v0.json`)

  for (const page of ['README.md', 'docs/getting-started/v0.mdx']) {
    const text = readFileSync(new URL(page, import.meta.url), 'utf8')
    assert.ok(text.includes(v0Link), `${page} lacks ${v0Link}`)
  }
})
