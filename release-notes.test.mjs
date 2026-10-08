/**
 * The notes of a GitHub release are cut out of `CHANGELOG.md` by
 * `scripts/release-notes.mjs`. Cutting at the wrong heading would ship one
 * release's notes under another's tag, so the boundaries are what this checks:
 * the newest section, one in the middle, and a version with none.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releaseNotes } from './scripts/release-notes.mjs'

const changelog = `# @pmndrs/design-system

## 0.3.0

### Minor Changes

- Third.

## 0.2.0

### Patch Changes

- Second.

  More about the second.

## 0.1.0

- First.
`

test('the first section stops at the next version', () => {
  assert.equal(releaseNotes(changelog, '0.3.0'), '### Minor Changes\n\n- Third.')
})

test('a middle section keeps its own blank lines and nothing of its neighbours', () => {
  assert.equal(releaseNotes(changelog, '0.2.0'), '### Patch Changes\n\n- Second.\n\n  More about the second.')
})

test('the last section runs to the end of the file', () => {
  assert.equal(releaseNotes(changelog, '0.1.0'), '- First.')
})

test('a version without a section has no notes', () => {
  assert.equal(releaseNotes(changelog, '0.4.0'), undefined)
  assert.equal(releaseNotes(changelog, '0.2'), undefined)
})
