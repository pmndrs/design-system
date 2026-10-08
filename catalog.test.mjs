/**
 * The catalog page is MDX, and its descriptions come from other repos' prose:
 * one stray `{` or `<` in a `registry.json` there and the docs site stops
 * building here. `build.test.mjs` cannot see that — the output would be
 * faithfully current — so this pins the escaping.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderCatalog } from './scripts/catalog.mjs'

const item = (description) => ({ name: 'x', type: 'registry:block', description })
const render = (description) => renderCatalog([{ repo: 'pmndrs/x', ref: 'v1.0.0', items: [item(description)] }])

test('MDX syntax in a description is escaped', () => {
  assert.match(render('takes {props} and <Child />'), /takes \\\{props\\\} and \\<Child \/\\>/)
})

test('inline code in a description is left as written', () => {
  assert.match(render('use `<Keypoints>` with `{ title }`'), /use `<Keypoints>` with `\{ title \}`/)
})
