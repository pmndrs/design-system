/**
 * The catalog is a table of links, generated into a page of hand-written
 * prose. `build.test.mjs` asserts the page is current, but not that what it
 * holds is right — so this pins the source links, install addresses and the
 * refs the `search` command is pinned to, and preserves prose around the markers.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endMarker, renderCatalog, startMarker, writeCatalog } from './scripts/catalog.mjs'

const registries = [
  { repo: 'pmndrs/a', ref: 'v1.0.0', items: [{ name: 'x', type: 'registry:lib' }] },
  { repo: 'pmndrs/b', ref: 'main', items: [{ name: 'y', type: 'registry:block' }] },
]

test('one row per item, across registries, in order', () => {
  const rows = renderCatalog(registries)
    .split('\n')
    .filter((line) => line.startsWith('| ['))
  assert.deepEqual(rows, [
    '| [x](https://github.com/pmndrs/a/tree/v1.0.0/registry/x) | `pmndrs/a/x#v1.0.0` |',
    '| [y](https://github.com/pmndrs/b/tree/main/registry/y) | `pmndrs/b/y#main` |',
  ])
})

test('hosted items use the namespace and link to the source served by it', () => {
  const catalog = renderCatalog([
    { repo: 'pmndrs/design-system', ref: 'v0.9.0', items: [{ name: 'logo', type: 'registry:item' }] },
  ])
  assert.match(catalog, /\[logo\]\(https:\/\/github\.com\/pmndrs\/design-system\/tree\/main\/registry\/logo\)/)
  assert.match(catalog, /`@pmndrs\/logo`/)
  assert.match(catalog, /search pmndrs\/design-system#v0\.9\.0/)
})

test('the `search` command is pinned to each registry\'s ref', () => {
  assert.match(renderCatalog(registries), /^pnpm dlx shadcn@latest search pmndrs\/a#v1\.0\.0 pmndrs\/b#main$/m)
})

test('the catalog is written between the markers, the prose around it untouched', () => {
  const page = ['## Items', 'Before.', startMarker, 'stale', endMarker, 'After.', ''].join('\n')
  const written = writeCatalog(page, registries)

  assert.equal(written, ['## Items', 'Before.', startMarker, '', renderCatalog(registries), '', endMarker, 'After.', ''].join('\n'))
  assert.equal(writeCatalog(written, registries), written)
})

test('a page that lost its markers is an error, not a silent no-op', () => {
  assert.throws(() => writeCatalog('## Items', registries), /lost its catalog markers/)
})
