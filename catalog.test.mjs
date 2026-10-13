/** Catalog links rendered into staged documentation. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderCatalog } from './scripts/catalog.mjs'

const registries = [
  { repo: 'pmndrs/a', ref: 'v1.0.0', items: [{ name: 'x', type: 'registry:lib' }] },
  { repo: 'pmndrs/b', ref: 'main', items: [{ name: 'y', type: 'registry:block' }] },
]

test('one row per item, across registries, in order', () => {
  const rows = renderCatalog(registries)
    .split('\n')
    .filter((line) => line.startsWith('| ['))
  assert.deepEqual(rows, [
    '| [x](https://github.com/pmndrs/a/tree/v1.0.0/registry/x) |  | `pmndrs/a/x#v1.0.0` |',
    '| [y](https://github.com/pmndrs/b/tree/main/registry/y) |  | `pmndrs/b/y#main` |',
  ])
})

test('hosted items use the namespace and link to the installable JSON', () => {
  const catalog = renderCatalog([
    { repo: 'pmndrs/design-system', ref: 'v0.9.0', items: [{ name: 'logo', type: 'registry:item' }] },
  ])
  assert.match(catalog, /\[logo\]\(https:\/\/pmndrs\.github\.io\/design-system\/r\/logo\.json\)/)
  assert.match(catalog, /`@pmndrs\/logo`/)
  assert.match(catalog, /search pmndrs\/design-system#v0\.9\.0/)
})

test('the `search` command is pinned to each registry\'s ref', () => {
  assert.match(renderCatalog(registries), /^npx shadcn@latest search pmndrs\/a#v1\.0\.0 pmndrs\/b#main$/m)
})

test('description cells show one sentence, keeping pipes and line breaks inside the cell', () => {
  const catalog = renderCatalog([
    { repo: 'pmndrs/docs', ref: 'main', items: [{ name: 'sample', type: 'registry:block', description: 'A panel with\nlight | dark modes. More details.' }] },
  ])
  assert.match(catalog, /\| A panel with light \\\| dark modes\. \|/)
  assert.doesNotMatch(catalog, /More details/)
})
