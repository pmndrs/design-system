/**
 * The catalog is MDX, and its descriptions come from other repos' prose: one
 * stray `{` or `<` in a `registry.json` there and the docs site stops building
 * here. `build.test.mjs` cannot see that — the output would be faithfully
 * current — so this pins the escaping, the links the summary table is made of,
 * and how the catalog shares its page with hand-written prose.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  endMarker,
  headingTitles,
  humanizeType,
  outsideCatalog,
  renderCatalog,
  startMarker,
  writeCatalog,
} from './scripts/catalog.mjs'

const item = (description) => ({ name: 'x', type: 'registry:block', description })
const render = (description) => renderCatalog([{ repo: 'pmndrs/x', ref: 'v1.0.0', items: [item(description)] }])

test('MDX syntax in a description is escaped', () => {
  assert.match(render('takes {props} and <Child />'), /takes \\\{props\\\} and \\<Child \/\\>/)
})

test('inline code in a description is left as written', () => {
  assert.match(render('use `<Keypoints>` with `{ title }`'), /use `<Keypoints>` with `\{ title \}`/)
})

test('the type drops its `registry:` prefix', () => {
  assert.equal(humanizeType('registry:block'), 'block')
  assert.equal(humanizeType('registry:lib'), 'lib')
})

test('an item name two registries share links to each one\'s own section', () => {
  const catalog = renderCatalog([
    { repo: 'pmndrs/a', ref: 'v1.0.0', items: [item('First.')] },
    { repo: 'pmndrs/b', ref: 'v1.0.0', items: [item('Second.')] },
  ])
  assert.match(catalog, /\| \[x\]\(#x\) \| block \| \[pmndrs\/a\]/)
  assert.match(catalog, /\| \[x\]\(#x-1\) \| block \| \[pmndrs\/b\]/)
})

test('a registry links to its `registry.json` at the pinned ref', () => {
  assert.match(render('A panel.'), /\| \[pmndrs\/x\]\(https:\/\/github\.com\/pmndrs\/x\/blob\/v1\.0\.0\/registry\.json\) \|/)
})

test('an item named like a heading above it links to its own, suffixed id', () => {
  const catalog = renderCatalog([{ repo: 'pmndrs/x', ref: 'v1.0.0', items: [item('A panel.')] }], { headingsAbove: ['X'] })
  assert.match(catalog, /\| \[x\]\(#x-1\) \|/)
})

test('an item named like one of the catalog\'s own headings links to its own, suffixed id', () => {
  const allItems = { ...item('A panel.'), name: 'all-items' }
  const catalog = renderCatalog([{ repo: 'pmndrs/x', ref: 'v1.0.0', items: [allItems] }])
  assert.match(catalog, /\| \[all-items\]\(#all-items-1\) \|/)
})

test('headings in fenced code are not headings', () => {
  assert.deepEqual(headingTitles(['## Install', '```sh', '# a shell comment', '```', '### Then'].join('\n')), [
    'Install',
    'Then',
  ])
})

const registries = [{ repo: 'pmndrs/x', ref: 'v1.0.0', items: [item('Needs `pmndrs/y/z#v0.1.0`.')] }]
const page = ['## X', 'Install `pmndrs/y/z#v0.1.0`.', startMarker, endMarker, 'Then `pmndrs/y/z#v0.1.0`.', ''].join('\n')
const bump = (text) => text.replaceAll('#v0.1.0', '#v0.2.0')

test('the catalog takes the anchors left by the page\'s headings above it', () => {
  assert.match(writeCatalog(page, registries), /\| \[x\]\(#x-1\) \|/)
})

test('a rewrite of the page skips the generated region', () => {
  const built = outsideCatalog(writeCatalog(page, registries), bump)
  const [before, rest] = built.split(startMarker)
  const [region, after] = rest.split(endMarker)

  assert.match(before, /Install `pmndrs\/y\/z#v0\.2\.0`/)
  assert.match(after, /Then `pmndrs\/y\/z#v0\.2\.0`/)
  assert.match(region, /Needs `pmndrs\/y\/z#v0\.1\.0`/)
  assert.doesNotMatch(region, /#v0\.2\.0/)
})

test('rewriting and writing the catalog, in either order, settle after one pass', () => {
  const once = writeCatalog(outsideCatalog(page, bump), registries)
  assert.equal(outsideCatalog(writeCatalog(page, registries), bump), once)
  assert.equal(writeCatalog(outsideCatalog(once, bump), registries), once)
})

test('a page without markers is rewritten whole', () => {
  assert.equal(outsideCatalog('`pmndrs/y/z#v0.1.0`', bump), '`pmndrs/y/z#v0.2.0`')
})
