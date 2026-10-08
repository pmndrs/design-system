/**
 * The catalog page is MDX, and its descriptions come from other repos' prose:
 * one stray `{` or `<` in a `registry.json` there and the docs site stops
 * building here. `build.test.mjs` cannot see that — the output would be
 * faithfully current — so this pins the escaping, and the links the summary
 * table is made of.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { humanizeType, renderCatalog } from './scripts/catalog.mjs'

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
