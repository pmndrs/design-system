/**
 * What `npm run artifact` writes for the Poimandres Design System artifact:
 * `tokens.json`, the brand book, the fonts and the block cards. These run the
 * generator into a temporary folder and assert the shape of what lands
 * there, against what the artifact reads, not how `scripts/artifact.mjs`
 * builds it.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { catalogBlocks, componentName, componentProblems, placeholders, writeArtifact } from './scripts/artifact.mjs'

const out = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'artifact-'))}/`)
writeArtifact(out)
after(() => rmSync(out, { recursive: true, force: true }))

const project = new URL('project/', out)
const walk = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((name) => statSync(new URL(name, dir)).isFile())
    .sort()
const paths = walk(project)
const read = (path) => readFileSync(new URL(path, project), 'utf8')
const textPaths = paths.filter((path) => !path.startsWith('fonts/'))

const tokens = JSON.parse(read('tokens.json'))
const cards = paths
  .filter((path) => path.endsWith('/preview.html'))
  .map((path) => ({ path, html: read(path), marker: read(path).split('\n')[0] }))

/** Every family but `type` is a list of `{name, value, usage}`: a name-to-value map shows empty. */
const families = Object.entries(tokens).filter(([, family]) => family?.tokens)

test('tokens.json has a token list per family, colour in a light and a dark theme', () => {
  assert.deepEqual(
    families.map(([key]) => key),
    ['color', 'spacing', 'radius', 'shadow', 'dropShadow']
  )
  for (const [key, family] of families) {
    assert.ok(Array.isArray(family.tokens) && family.tokens.length, `${key} has no token list`)
    for (const token of family.tokens) {
      assert.deepEqual(Object.keys(token), ['name', 'value', 'usage'], `${key}: ${JSON.stringify(token)}`)
      assert.ok(token.usage.trim(), `${key}: ${token.name} has no usage`)
    }
  }
  assert.deepEqual(
    tokens.color.themes.map(({ id }) => id),
    ['light', 'dark']
  )
})

/** The artifact drops a token whose name it cannot read, and all but `type` share one namespace. */
test('every token name is valid and unique across families', () => {
  const names = families.flatMap(([, family]) => family.tokens.map(({ name }) => name))
  assert.deepEqual(
    names.filter((name) => !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(name)),
    []
  )
  assert.deepEqual(
    names.filter((name, index) => names.indexOf(name) !== index),
    []
  )
})

const colors = new Map(tokens.color.tokens.map((token) => [token.name, token.value]))

/** A colour token's value in `theme`: a later theme borrows the first's where it has none. */
const valueIn = (value, theme) => (typeof value === 'string' ? value : (value[theme] ?? value.light))

/** The hex a colour token resolves to in `theme`, following its aliases. */
function resolve(name, theme, seen = []) {
  assert.ok(colors.has(name), `{${name}} names no colour token (via ${seen.join(' > ')})`)
  assert.ok(!seen.includes(name) && seen.length < 16, `alias cycle: ${[...seen, name].join(' > ')}`)
  const value = valueIn(colors.get(name), theme)
  const alias = value.match(/^\{(.+)\}$/)?.[1]
  return alias ? resolve(alias, theme, [...seen, name]) : value
}

test('every colour value is a lowercase hex or an alias that resolves, in both themes', () => {
  for (const [name, value] of colors) {
    for (const theme of ['light', 'dark']) {
      assert.match(resolve(name, theme), /^#[0-9a-f]{6}$/, `${name} in ${theme}: ${JSON.stringify(value)}`)
    }
  }
})

test('every font tokens.json lists is a file of the output', () => {
  assert.ok(tokens.type.fonts.length)
  assert.deepEqual(
    tokens.type.fonts.map(({ file }) => file).filter((file) => !paths.includes(file)),
    []
  )
  const styles = tokens.type.groups.flatMap(({ styles }) => styles)
  assert.ok(styles.every(({ fontSize, usage }) => /^[\d.]+rem$/.test(fontSize) && usage))
})

/** The artifact sections a card by `group` and gives its row `height` px, within the card height. */
test('every card starts with an @dsCard line naming its group and a height within 400px', () => {
  assert.ok(cards.length, 'no card generated')
  for (const { path, marker } of cards) {
    const match = marker.match(/^<!-- @dsCard group="[^"]+" height=(\d+)\b.*-->$/)
    assert.ok(match, `${path}: ${marker}`)
    assert.ok(Number(match[1]) >= 40 && Number(match[1]) <= 400, `${path}: height ${match[1]}`)
  }
})

/**
 * The brand book marks what the docs site leaves out, and the artifact keeps
 * all of it: its "Not synced" section, and no marker a design agent would read
 * as part of the text.
 */
test('the brand book keeps its artifact-only passages, without their markers', () => {
  const readme = read('README.md')
  assert.match(readme, /^## Not synced$/m)
  assert.doesNotMatch(readme, /artifact-only/)
})

test('every component has a README beside its preview', () => {
  assert.deepEqual(
    cards.map(({ path }) => path.replace('preview.html', 'README.md')).filter((path) => !paths.includes(path)),
    []
  )
})

/** The artifact caps a preview at 256 KiB. */
test('every file is under 256 KiB', () => {
  const heavy = paths.filter((path) => statSync(new URL(path, project)).size >= 256 * 1024)
  assert.deepEqual(heavy, [])
})

/** A colour in a card is a `var(--<token>)` of tokens.json, never typed in. */
test('no card hardcodes a hex colour', () => {
  const offenders = cards.flatMap(({ path, html }) => (html.match(/#[0-9a-f]{3,8}\b/gi) ?? []).map((hex) => `${path}: ${hex}`))
  assert.deepEqual(offenders, [])
})

/** WCAG relative luminance of `#rrggbb`. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/**
 * The text of a card stays readable on its surfaces and on its page, light or
 * dark: every rule that sets a text colour, on the surface the same rule
 * names, or on the page's when it names none, reaches 4.5:1 in both themes.
 */
test('every text colour in a card reaches 4.5:1 on its surface, in both themes', () => {
  const failures = []
  for (const { path, html } of cards) {
    const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => ({
      selector: selector.trim(),
      color: body.match(/(?:^|;)color:var\(--([\w-]+)\)/)?.[1],
      background: body.match(/(?:^|;)background:var\(--([\w-]+)\)/)?.[1],
    }))
    const page = rules.find(({ selector }) => selector === 'body')
    assert.ok(page?.color && page.background, `${path}: the body names no colour and surface`)
    for (const { selector, color, background = page.background } of rules.filter((rule) => rule.color)) {
      for (const theme of ['light', 'dark']) {
        const ratio = contrast(resolve(color, theme), resolve(background, theme))
        if (ratio < 4.5) failures.push(`${path} ${selector}: ${color} on ${background}, ${theme}: ${ratio.toFixed(2)}`)
      }
    }
  }
  assert.deepEqual(failures, [])
})

/**
 * The artifact's Components section is the registry catalog's blocks, one
 * card each, and nothing else: it draws the foundations itself, from
 * tokens.json.
 */
test('the components are the blocks of the registry catalog, one card each', () => {
  assert.ok(catalogBlocks.length, 'the catalog lists no block')
  const folders = [...new Set(paths.filter((path) => path.startsWith('components/')).map((path) => path.split('/')[1]))]
  assert.deepEqual(folders.sort(), catalogBlocks.map(componentName).sort())
})

test('a catalog block without a hand-written card, or a card without a block, is reported', () => {
  const paths = ['README.md', 'components/Keypoints/README.md', 'components/Keypoints/preview.html', 'components/Stale/README.md']
  assert.deepEqual(componentProblems(['keypoints', 'color-group'], paths), [
    'artifact/components/ColorGroup/README.md is missing: every block of the catalog has a hand-written card',
    'artifact/components/ColorGroup/preview.html is missing: every block of the catalog has a hand-written card',
    'artifact/components/Stale is no block of the catalog',
  ])
  assert.deepEqual(componentProblems(['keypoints'], paths.slice(0, 3)), [])
})

/**
 * The shadcn preset changes with `preset.json`: its code and style reach the
 * output through placeholders, never typed into a source.
 */
test('no source names the preset code or style itself', () => {
  const preset = JSON.parse(readFileSync(new URL('./preset.json', import.meta.url), 'utf8'))
  const literals = [preset.code, `base-${preset.values.style}`]
  const sources = [
    ...walk(new URL('./artifact/', import.meta.url)).map((path) => `artifact/${path}`),
    'scripts/artifact.notes.json',
  ]
  const offenders = sources.filter((path) =>
    literals.some((literal) => readFileSync(new URL(`./${path}`, import.meta.url), 'utf8').includes(literal))
  )
  assert.deepEqual(offenders, [])
})

const version = /\bv?\d+\.\d+\.\d+\b/g

/**
 * Versions go stale, so each lives in one place: a placeholder, filled from
 * git, `package.json`, `node_modules`, `registry/external.json` or the pins
 * of `artifact.notes.json`. The hand-written files name none, and every
 * version in the output is a placeholder's value.
 */
test('every version in the output comes from a placeholder', () => {
  const sources = walk(new URL('./artifact/', import.meta.url)).map((path) => [
    `artifact/${path}`,
    readFileSync(new URL(`./artifact/${path}`, import.meta.url), 'utf8'),
  ])
  assert.deepEqual(
    sources.filter(([, text]) => new RegExp(version.source).test(text)).map(([path]) => path),
    []
  )

  const allowed = Object.values(placeholders).join(' ')
  const stray = textPaths.flatMap((path) =>
    (read(path).match(version) ?? []).filter((found) => !allowed.includes(found)).map((found) => `${path}: ${found}`)
  )
  assert.deepEqual(stray, [])
  assert.deepEqual(
    textPaths.filter((path) => read(path).includes('{{')),
    []
  )
})

/**
 * `meta.paths.docs` points a design agent at the pages the design system is
 * written down in: every page of the docs site, a new one included.
 */
test('every page of the docs site is listed in meta.paths.docs', () => {
  const pages = walk(new URL('./docs/', import.meta.url))
    .filter((path) => path.endsWith('.mdx'))
    .map((path) => `docs/${path}`)
  assert.deepEqual(
    pages.filter((page) => !tokens.meta.paths.docs.includes(page)),
    []
  )
})
