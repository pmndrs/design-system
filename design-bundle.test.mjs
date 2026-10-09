/**
 * `design/` is what a design tool is handed — Claude Design through
 * `/design-sync`, or anything else that reads plain files. These assert the
 * shape it receives, read off the committed files, not how
 * `scripts/design-bundle.mjs` builds it; the one exception is the "is current"
 * check, which compares against the script's own `outputs` as `build.test.mjs`
 * does for `registry.json`.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { test } from 'node:test'
import pkg from './package.json' with { type: 'json' }
import { designDir, outputs } from './scripts/design-bundle.mjs'

const root = new URL('./', import.meta.url)
const files = readdirSync(designDir).map((name) => new URL(name, designDir))
const read = (url) => readFileSync(url, 'utf8')
const relative = (url) => url.pathname.replace(root.pathname, '')

const marker = /^<!-- @dsCard group="([^"]+)" -->$/
const cards = files
  .filter((url) => url.pathname.endsWith('.html'))
  .map((url) => ({ url, html: read(url), group: read(url).split('\n')[0].match(marker)?.[1] }))

for (const [url, next] of outputs) {
  test(`${relative(url)} is current`, () => {
    const current = files.some((file) => file.href === url.href) ? read(url) : null
    assert.equal(current, next, `${relative(url)} is out of date — run \`npm run design-bundle\` and commit the result.`)
  })
}

/** A card the script stopped producing would still be synced, as a stale card. */
test('design/ holds nothing the script does not produce', () => {
  const produced = new Set(outputs.map(([url]) => url.href))
  assert.deepEqual(files.filter((url) => !produced.has(url.href)).map(relative), [])
})

/**
 * Claude Design makes a card of an HTML file only when its very first line is
 * the marker; anywhere else, the file is synced and never shown.
 */
test('every card starts with the @dsCard marker', () => {
  assert.ok(cards.length, 'no card in design/')
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
 * Synced once per release, and committed, so the bundle must not go stale on
 * a version bump: no version and no pinned install ref in it. An install
 * address reads `#<tag>`.
 */
test('no file names a version', () => {
  const version = new RegExp(`#v\\d+\\.\\d+\\.\\d+|\\b${pkg.version.replaceAll('.', '\\.')}\\b`)
  assert.deepEqual(files.filter((url) => version.test(read(url))).map(relative), [])
})
