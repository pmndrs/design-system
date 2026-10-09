/**
 * The `v0` item and the files it ships, written by `build.mjs` through
 * `scripts/v0.mjs`. `build.test.mjs` holds the generated ones current; these
 * hold them to what they claim: the pmndrs colours, fonts and radius, under
 * the names a pmndrs project has, in a project v0 can preview as it opens.
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
import { brandGuidelinesPrompt, brandLime, v0Links } from './scripts/v0.mjs'

/**
 * Open in v0 drops `css`, `cssVars` and namespaces, and resolves no GitHub
 * address (shadcn's Open in v0 docs; vercel/registry-starter and shadcn's own
 * create flow both ship the theme as a file). So the item it opens carries
 * everything as files of v0's Next.js project, and depends on nothing but
 * absolute URLs.
 */
const v0 = () => registry.items.find((item) => item.name === 'v0')
const item = (name) => registry.items.find((entry) => entry.name === name)
const fileAt = (target) => v0().files.find((file) => file.target === target)
const read = (target) => readFileSync(new URL(fileAt(target).path, import.meta.url), 'utf8')

test('the v0 item ships a whole v0 project as files, and nothing v0 drops', () => {
  const v0Item = v0()

  assert.ok(v0Item, 'no `v0` item')
  assert.equal(v0Item.type, 'registry:item')
  assert.deepEqual(
    v0Item.files.map(({ type, target }) => ({ type, target })),
    [
      'app/globals.css',
      'app/layout.tsx',
      'app/page.tsx',
      'public/pmndrs/logo_complete.svg',
      'public/pmndrs/logo_idle.svg',
      'public/pmndrs/logo_animated.svg',
      'public/pmndrs/logo_loading.svg',
      'guidelines/Guidelines.md',
    ].map((target) => ({ type: 'registry:file', target }))
  )
  assert.equal(v0Item.css, undefined)
  assert.equal(v0Item.cssVars, undefined)
  const relative = (v0Item.registryDependencies ?? []).filter((dependency) => !dependency.startsWith('https://'))
  assert.deepEqual(relative, [])
})

/**
 * The logo and the brand book are the `logo` and `guidelines` items' own
 * files, at the same project paths minus the `~/` only the CLI reads: one
 * source each, so v0 cannot be handed an older logo or other guidelines.
 */
test('the v0 item ships the logo and the guidelines from the same sources as their items', () => {
  for (const name of ['logo', 'guidelines']) {
    for (const { path, target } of item(name).files) {
      const shipped = fileAt(target.replace(/^~\//, ''))
      assert.ok(shipped, `v0 lacks ${target}`)
      assert.equal(shipped.path, path)
    }
  }
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

/**
 * Without the palette, the shadcn variables have to be literal colours, and
 * the right ones: each the hex the remap's MD3 role has, against the remap as
 * the package ships it.
 */
test('the v0 globals.css gives every shadcn variable the hex of its MD3 role, light and dark', () => {
  const css = globalsCss()

  const mismatches = []
  for (const [mode, selector] of modes) {
    const hexOf = figmaHex(mode)
    const declared = block(css, selector)
    for (const { name, role } of readRemap()) {
      if (declared[name]?.toLowerCase() !== hexOf[role]) {
        mismatches.push(`${mode} ${name}: ${declared[name]}, ${role} is ${hexOf[role]}`)
      }
    }
  }

  assert.deepEqual(mismatches, [])
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
 * And every MD3 variable is declared, as the hex Figma has for it, light and
 * dark: every role, for code that names one (`var(--md-sys-color-surface-dim)`,
 * as the guidelines write them), and every tonal shade a utility above maps.
 */
test('the v0 globals.css declares every MD3 role and mapped shade as its literal hex, light and dark', () => {
  const css = globalsCss()
  const root = block(css, ':root')
  const mapped = [...Object.values(block(css, '@theme inline')).join(' ').matchAll(/var\((--md-[\w-]+)\)/g)].map(([, name]) => name)

  const mismatches = []
  for (const [mode, selector] of modes) {
    const hexOf = figmaHex(mode)
    const declared = { ...root, ...block(css, selector) }
    const roles = Object.keys(hexOf).filter((name) => name.startsWith('--md-sys-color-'))
    for (const name of new Set([...roles, ...mapped])) {
      if (!hexOf[name] || declared[name]?.toLowerCase() !== hexOf[name]) mismatches.push(`${mode} ${name}: ${declared[name]}, Figma has ${hexOf[name]}`)
    }
  }
  assert.deepEqual(mismatches, [])
})

/**
 * v0 rewrote the stylesheet once, taking pmndrs for the Poimandres VS Code
 * theme: the file says what it is, and that it is not to be edited, first.
 */
test('the v0 globals.css opens on what it is, and that it is not to be edited', () => {
  assert.ok(
    globalsCss().startsWith(
      '/*\n * This is the pmndrs design system palette (not the Poimandres VS Code theme). Do not edit; use these tokens, never a hex.\n'
    )
  )
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

  const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name))
  const dangling = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name).filter((name) => !declared.has(name))
  assert.deepEqual(dangling, [])
})

test('the v0 layout loads the stylesheet, in English, with the fonts', () => {
  const layout = read('app/layout.tsx')

  assert.match(layout, /^import '\.\/globals\.css'$/m)
  assert.match(layout, /<html lang="en"/)
  assert.match(layout, /<body className="[^"]*\bfont-sans\b/)
})

/**
 * The colour utilities a file uses: `bg-*`, `text-*` and `border-*` whose
 * suffix is not a size, an alignment or a width.
 */
const colourUtilities = (source) =>
  [...source.matchAll(/\b(?:bg|text|border)-([a-z][\w-]*)/g)]
    .map(([, name]) => name)
    .filter((name) => !/^(xs|sm|base|lg|\d?xl|left|center|right|balance|pretty)$/.test(name))

/**
 * v0 imported the theme and generated nothing: the preview stayed blank. The
 * starter page shows the theme straight away, and through its tokens only, so
 * it is also the first example of them v0 reads.
 */
test('the v0 starter page shows the logo, the brand lime and a dark toggle, through tokens only', () => {
  const page = read('app/page.tsx')
  const theme = block(globalsCss(), '@theme inline')

  assert.ok(page.includes('src="/pmndrs/logo_complete.svg"'), 'no logo')
  assert.ok(page.includes(brandLime.fill) && page.includes(brandLime.on), `no ${brandLime.fill}`)
  assert.match(page, /classList\.toggle\('dark'\)/)
  assert.doesNotMatch(page, /#[0-9a-f]{3,8}\b/i)
  const unknown = colourUtilities(page).filter((name) => !theme[`--color-${name}`])
  assert.deepEqual(unknown, [])
})

/**
 * v0 could not find the brand lime: `bg-lime` is a dark olive in light, the
 * MD3 role a colour seeded at its own hex gives the seed to its container. So
 * the prompt names the fill that is the seed hex, checked here against the
 * brand lime itself rather than read back from the code that picks it.
 */
test('the brand lime the prompt names is the seed hex, on the role meant to go on it', () => {
  const root = block(globalsCss(), ':root')
  const variable = (utility) => `--md-sys-color-${utility.replace(/^(bg|text)-/, '')}`

  assert.equal(root[variable(brandLime.fill)], '#caf543')
  assert.ok(root[variable(brandLime.on)])
})

/**
 * The prompt of the brand-guidelines link: v0's button builder caps it at 500
 * characters, and it points at what the item ships.
 */
test('the brand-guidelines prompt fits v0, and names files the item ships', () => {
  assert.ok(brandGuidelinesPrompt.length <= 500, `${brandGuidelinesPrompt.length} characters`)
  assert.ok(brandGuidelinesPrompt.includes(brandLime.fill))
  assert.ok(brandGuidelinesPrompt.includes('guidelines/Guidelines.md') && fileAt('guidelines/Guidelines.md'))
  assert.ok(brandGuidelinesPrompt.includes('/pmndrs/logo_complete.svg') && fileAt('public/pmndrs/logo_complete.svg'))
})

/**
 * Both links open the hosted item; the brand-guidelines one carries the
 * prompt. They are generated once, so the README and the getting-started page
 * hand out the same two.
 */
test('the README and the getting-started page hand out both Open in v0 links, as generated', () => {
  const brand = new URL(v0Links.brandGuidelines)
  assert.equal(brand.searchParams.get('url'), `${hostedUrl}v0.json`)
  assert.equal(brand.searchParams.get('prompt'), brandGuidelinesPrompt)
  assert.equal(new URL(v0Links.theme).searchParams.get('url'), `${hostedUrl}v0.json`)

  for (const page of ['README.md', 'docs/getting-started/introduction.mdx']) {
    const text = readFileSync(new URL(page, import.meta.url), 'utf8')
    for (const link of Object.values(v0Links)) assert.ok(text.includes(`(${link})`), `${page} lacks ${link}`)
  }
})
