/**
 * `preset.json` is the reviewable form of the preset; `b5cR4Y50S` is the opaque
 * form the CLI takes. These assert they still say the same thing — a preset code
 * is a bit-packed enum tuple, so a one-character typo silently decodes to a
 * different, valid preset.
 *
 * Both directions are checked, as separate tests so a drift reports both: the
 * decode names which values disagree, the encode gives the code to paste.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { decodePreset, encodePreset } from 'shadcn/preset'

const preset = JSON.parse(readFileSync(new URL('./preset.json', import.meta.url), 'utf8'))

test('the code decodes to the values', () => {
  const decoded = decodePreset(preset.code)
  assert.ok(decoded, `${preset.code} is not a valid preset code`)
  assert.deepEqual(decoded, preset.values)
})

test('the values encode to the code', () => {
  assert.equal(encodePreset(preset.values), preset.code)
})

/**
 * The third copy of the code, and the one nobody re-reads — a stale link opens
 * a valid preset that is not this one, which looks like success.
 */
test('the url opens this preset', () => {
  assert.equal(new URL(preset.url).searchParams.get('preset'), preset.code)
})
