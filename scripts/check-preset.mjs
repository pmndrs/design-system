/**
 * `preset.json` is the reviewable form of the preset; `b5cR4Y50S` is the opaque
 * form the CLI takes. This asserts they still say the same thing — a preset code
 * is a bit-packed enum tuple, so a one-character typo silently decodes to a
 * different, valid preset.
 */
import { readFileSync } from 'node:fs'
import { decodePreset, encodePreset } from 'shadcn/preset'

const preset = JSON.parse(readFileSync(new URL('../preset.json', import.meta.url), 'utf8'))

const decoded = decodePreset(preset.code)
if (!decoded) {
  console.error(`✖ ${preset.code} is not a valid preset code`)
  process.exit(1)
}

const mismatched = Object.keys(decoded).filter((key) => decoded[key] !== preset.values[key])
if (mismatched.length) {
  console.error(`✖ ${preset.code} decodes differently than preset.json:`)
  for (const key of mismatched) {
    console.error(`    ${key}: code says ${decoded[key]}, preset.json says ${preset.values[key]}`)
  }
  console.error(`  ${encodePreset(preset.values)} is the code for preset.json's values.`)
  process.exit(1)
}

console.log(`✔ ${preset.code} round-trips against preset.json`)
