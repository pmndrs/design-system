/**
 * The catalog is a table of links, generated into a page of hand-written
 * prose. `build.test.mjs` asserts the page is current, but not that what it
 * holds is right — so this pins where each link points, the refs the `search`
 * command is pinned to, and that the prose around the markers is left alone.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endMarker, humanizeType, renderCatalog, startMarker, writeCatalog } from './scripts/catalog.mjs'

const registries = [
  { repo: 'pmndrs/a', ref: 'v1.0.0', items: [{ name: 'x', type: 'registry:lib' }] },
  { repo: 'pmndrs/b', ref: 'main', items: [{ name: 'y', type: 'registry:block' }] },
]

test('the type drops its `registry:` prefix', () => {
  assert.equal(humanizeType('registry:block'), 'block')
  assert.equal(humanizeType('registry:lib'), 'lib')
})

test('one row per item, across registries, in order', () => {
  const rows = renderCatalog(registries)
    .split('\n')
    .filter((line) => line.startsWith('| ['))
  assert.deepEqual(rows, [
    '| [x](https://github.com/pmndrs/a/tree/v1.0.0/registry/x) | lib | [pmndrs/a](https://github.com/pmndrs/a/blob/v1.0.0/registry.json) |',
    '| [y](https://github.com/pmndrs/b/tree/main/registry/y) | block | [pmndrs/b](https://github.com/pmndrs/b/blob/main/registry.json) |',
  ])
})

test('the `search` command is pinned to each registry\'s ref', () => {
  assert.match(renderCatalog(registries), /^npx shadcn@latest search pmndrs\/a#v1\.0\.0 pmndrs\/b#main$/m)
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
