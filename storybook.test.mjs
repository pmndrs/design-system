import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { storybookRefs } from './scripts/storybook.mjs'

const catalog = JSON.parse(readFileSync(new URL('./registry/external.json', import.meta.url)))

test('composition uses the recorded release build and labels its version', () => {
  const refs = storybookRefs(catalog)
  assert.equal(refs['pmndrs-docs'].title, `${catalog[0].repo} @ ${catalog[0].ref}`)
  assert.equal(refs['pmndrs-docs'].url, catalog[0].storybook.url)
})

test('a registry version change cannot silently reuse an older Storybook', () => {
  assert.throws(() => storybookRefs([{ ...catalog[0], ref: 'v5.0.0' }]), /update the Storybook build/)
})

test('registries without a published Storybook remain valid catalog entries', () => {
  assert.deepEqual(storybookRefs([{ repo: 'pmndrs/example', ref: 'v1.0.0' }]), {})
})

test('a published Storybook requires a full commit SHA', () => {
  assert.throws(() => storybookRefs([{
    ...catalog[0], storybook: { ...catalog[0].storybook, commit: 'main' },
  }]), /full release commit SHA/)
})
