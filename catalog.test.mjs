/**
 * The catalog page is MDX, and its descriptions come from other repos' prose:
 * one stray `{` or `<` in a `registry.json` there and the docs site stops
 * building here. `build.test.mjs` cannot see that — the output would be
 * faithfully current — so this pins the escaping, and what the summary table
 * makes of a description.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firstSentence, humanizeType, renderCatalog } from './scripts/catalog.mjs'

const item = (description) => ({ name: 'x', type: 'registry:block', description })
const render = (description) => renderCatalog([{ repo: 'pmndrs/x', ref: 'v1.0.0', items: [item(description)] }])

test('MDX syntax in a description is escaped', () => {
  assert.match(render('takes {props} and <Child />'), /takes \\\{props\\\} and \\<Child \/\\>/)
})

test('inline code in a description is left as written', () => {
  assert.match(render('use `<Keypoints>` with `{ title }`'), /use `<Keypoints>` with `\{ title \}`/)
})

test('a pipe in a description does not split its table cell', () => {
  assert.match(render('either a | b.'), /\| either a \\\| b\. \|/)
})

test('the summary is the first sentence', () => {
  assert.equal(firstSentence('A panel. Usually after the intro.'), 'A panel.')
  assert.equal(firstSentence('Uses `a.b` here! Then more.'), 'Uses `a.b` here!')
  assert.equal(firstSentence('No full stop'), 'No full stop')
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
  assert.match(catalog, /\[x\]\(#x\) \| pmndrs\/a/)
  assert.match(catalog, /\[x\]\(#x-1\) \| pmndrs\/b/)
})
