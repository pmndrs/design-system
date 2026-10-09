/**
 * The `v0` item and the `globals.css` it ships, written by `build.mjs` through
 * `scripts/v0.mjs`. `build.test.mjs` holds the file current; these hold it to
 * what it claims: the pmndrs colours, fonts and radius, in a shape v0 reads.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }
import { readFoundations } from './scripts/foundations.mjs'
import { registersFamily } from './scripts/packages.mjs'
import { readRemap } from './scripts/remap.mjs'

/**
 * Open in v0 drops `css`, `cssVars` and namespaces, and resolves no GitHub
 * address (shadcn's Open in v0 docs; vercel/registry-starter and shadcn's own
 * create flow both ship the theme as a file). So the item it opens carries the
 * theme as one file, `app/globals.css` of v0's Next.js project, and depends on
 * nothing but absolute URLs.
 */
const v0 = () => registry.items.find((item) => item.name === 'v0')

test('the v0 item ships the theme as the globals.css of a v0 project, and nothing v0 drops', () => {
  const item = v0()

  assert.ok(item, 'no `v0` item')
  assert.equal(item.type, 'registry:item')
  assert.deepEqual(
    item.files.map(({ type, target }) => ({ type, target })),
    [{ type: 'registry:file', target: 'app/globals.css' }]
  )
  assert.equal(item.css, undefined)
  assert.equal(item.cssVars, undefined)
  const relative = (item.registryDependencies ?? []).filter((dependency) => !dependency.startsWith('https://'))
  assert.deepEqual(relative, [])
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

const globalsCss = () => readFileSync(new URL(v0().files[0].path, import.meta.url), 'utf8')

/**
 * Without the palette, the shadcn variables have to be literal colours, and
 * the right ones: each the hex the remap's MD3 role has. Checked against the
 * Figma tokens, which come off the palette by a different path than the CSS
 * bake, and against the remap as the package ships it.
 */
test('the v0 globals.css gives every shadcn variable the hex of its MD3 role, light and dark', () => {
  const css = globalsCss()

  const mismatches = []
  for (const [mode, selector] of [
    ['Light', ':root'],
    ['Dark', '.dark'],
  ]) {
    const tokens = JSON.parse(readFileSync(new URL(`./figma/${mode}.tokens.json`, import.meta.url), 'utf8'))
    const hexOf = {}
    const walk = (node) => {
      if (node?.$value && node.$extensions?.['css.variable']) {
        let value = node.$value
        while (typeof value === 'string') value = value.slice(1, -1).split('.').reduce((n, key) => n[key], tokens).$value
        hexOf[node.$extensions['css.variable']] = value.hex.toLowerCase()
      } else if (typeof node === 'object') Object.values(node).forEach(walk)
    }
    walk(tokens.sys)

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
