/**
 * What `npm run design-bundle` hands the `/design-sync` converter: the design
 * stylesheet, the guidelines and the cards. These run the generator into a
 * temporary folder and assert the shape of what lands there, not how
 * `scripts/design-bundle.mjs` builds it.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { pathToFileURL } from 'node:url'
import pkg from './package.json' with { type: 'json' }
import { writeDesign } from './scripts/design-bundle.mjs'

const out = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'design-bundle-'))}/`)
writeDesign(out)
after(() => rmSync(out, { recursive: true, force: true }))

const files = readdirSync(out, { recursive: true })
  .map((name) => new URL(name, out))
  .filter((url) => statSync(url).isFile())
const read = (url) => readFileSync(url, 'utf8')
const relative = (url) => url.pathname.replace(out.pathname, '')

const marker = /^<!-- @dsCard group="([^"]+)" -->$/
const cards = files
  .filter((url) => url.pathname.endsWith('.html'))
  .map((url) => ({ url, html: read(url), group: read(url).split('\n')[0].match(marker)?.[1] }))

/**
 * Claude Design makes a card of an HTML file only when its very first line is
 * the marker; anywhere else, the file is synced and never shown.
 */
test('every card starts with the @dsCard marker', () => {
  assert.ok(cards.length, 'no card generated')
  assert.deepEqual(cards.filter((card) => !card.group).map((card) => relative(card.url)), [])
})

/** The sync caps every file at 256 KiB. */
test('every file is under 256 KiB', () => {
  const heavy = files.filter((url) => statSync(url).size >= 256 * 1024).map((url) => `${relative(url)}: ${statSync(url).size} bytes`)
  assert.deepEqual(heavy, [])
})

/**
 * A colour in a card comes from the palette, through a token or a role, never
 * typed in. The `<style>` is out of scope: it is compiled, the palette baked
 * by `npm run build` and the rest Tailwind's own output — which writes a few
 * hex of its own, the `#0000` its shadow utilities start from. The markup is
 * what a card author writes, and there is no hex in it, inline style included.
 */
test('no card hardcodes a hex colour', () => {
  const offenders = cards.flatMap(({ url, html }) =>
    (html.replace(/<style>[\s\S]*?<\/style>/g, '').match(/#[0-9a-f]{3,8}\b/gi) ?? []).map((hex) => `${relative(url)}: ${hex}`)
  )

  assert.deepEqual(offenders, [])
})

/**
 * Each foundation page of the docs has its card group — the Claude Design
 * labels, hence Type for Typography and Brand for Assets. A new page under
 * `docs/` fails here until it is given a group, and that group a card.
 *
 * `getting-started` is the introduction, not a foundation.
 */
test('every docs foundation page has a card in its group', () => {
  const groups = {
    colors: 'Colors',
    typography: 'Type',
    spacing: 'Spacing',
    radius: 'Radius',
    shadows: 'Shadows',
    assets: 'Brand',
  }
  const pages = readdirSync(new URL('./docs/', import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'getting-started')
    .map((entry) => entry.name)

  const missing = pages.filter((page) => !cards.some((card) => card.group === groups[page]))
  assert.deepEqual(missing, [])
})

/**
 * Built from a release tag and synced once per release, so the output must
 * depend on the tag alone: no version and no pinned install ref in it. An
 * install address reads `#<tag>`.
 */
test('no file names a version', () => {
  const version = new RegExp(`#v\\d+\\.\\d+\\.\\d+|\\b${pkg.version.replaceAll('.', '\\.')}\\b`)
  assert.deepEqual(files.filter((url) => version.test(read(url))).map(relative), [])
})

/**
 * The snippet the guidelines end on is what a design copies first: each of
 * its classes must have a rule in the stylesheet the design is handed, or the
 * snippet renders unstyled.
 */
test('every class of the guidelines example is in the stylesheet', () => {
  const guidelines = read(new URL('guidelines.md', out))
  const css = read(new URL('styles.css', out))
  const snippet = guidelines.match(/```jsx\n([\s\S]*?)```/)?.[1]
  assert.ok(snippet, 'no jsx example in guidelines.md')

  const classes = [...snippet.matchAll(/className="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/))
  const selector = (name) => `.${name.replace(/[^\w-]/g, (char) => `\\${char}`)}`
  const missing = classes.filter((name) => !new RegExp(`${RegExp.escape(selector(name))}(?![\\w\\\\-])`).test(css))
  assert.deepEqual(missing, [])
})
