/** Catalog data shared by the authored documentation and registry search command. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogEntries, registrySearchCommand } from './scripts/catalog.mjs'

const registries = [
  { repo: 'pmndrs/a', ref: 'v1.0.0', items: [{ name: 'x', type: 'registry:lib' }] },
  { repo: 'pmndrs/b', ref: 'main', items: [{ name: 'y', type: 'registry:block' }] },
]

test('one entry per item, across registries, in order', () => {
  assert.deepEqual(catalogEntries(registries), [
    { name: 'x', href: 'https://github.com/pmndrs/a/tree/v1.0.0/registry/x', description: '', address: 'pmndrs/a/x#v1.0.0' },
    { name: 'y', href: 'https://github.com/pmndrs/b/tree/main/registry/y', description: '', address: 'pmndrs/b/y#main' },
  ])
})

test('hosted items use the namespace and link to the installable JSON', () => {
  const [entry] = catalogEntries([
    { repo: 'pmndrs/design-system', ref: 'v0.9.0', items: [{ name: 'logo', type: 'registry:item', description: 'Long registry description.' }] },
  ])
  assert.deepEqual(entry, {
    name: 'logo',
    href: 'https://pmndrs.github.io/design-system/r/logo.json',
    description: 'Static and animated pmndrs logos as SVG files.',
    address: '@pmndrs/logo',
  })
})

test('the search command is pinned to each registry ref', () => {
  assert.equal(registrySearchCommand(registries), 'npx shadcn@latest search pmndrs/a#v1.0.0 pmndrs/b#main')
})

test('descriptions show one sentence as plain text, without Markdown escaping', () => {
  const [entry] = catalogEntries([
    { repo: 'pmndrs/docs', ref: 'main', items: [{ name: 'sample', type: 'registry:block', description: 'A panel with\nlight | dark modes. More details.' }] },
  ])
  assert.equal(entry.description, 'A panel with light | dark modes.')
})
