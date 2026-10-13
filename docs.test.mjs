import assert from 'node:assert/strict'
import { test } from 'node:test'
import config from './docs.config.ts'
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { themePresets } from './registry/md3-base/presets.ts'
import { v0Link } from './scripts/v0.mjs'
import { foundationVariables } from './scripts/foundation-tokens.mjs'

const { scope } = config

test('documentation addresses shared foundation values by name, not array position', () => {
  assert.equal(scope.spacing['4'].value, '1rem')
  assert.equal(scope.spacing['4'].pixels, foundationVariables(scope.foundations).spacing['4'].$value.value)
  assert.equal(scope.typeScale['text-sm'].pixels.fontSize, 14)
  assert.equal(scope.radii['--radius-lg'].value, scope.foundations.radius.base)
  assert.equal(scope.shadows['shadow-sm'].variable, '--shadow-sm')
  assert.equal(scope.shadows['inset-shadow-sm'].variable, '--inset-shadow-sm')
  assert.equal(scope.shadows['drop-shadow-sm'].variable, '--drop-shadow-sm')
})

test('documentation catalog addresses each item by repository and name', () => {
  assert.equal(scope.catalog['pmndrs/design-system/theme'].address, '@pmndrs/theme')
  assert.equal(scope.catalog['pmndrs/design-system/theme'].href, 'https://pmndrs.github.io/design-system/r/theme.json')
  assert.equal(scope.catalog['pmndrs/docs/color'].name, 'color')
  assert.match(scope.catalog['pmndrs/docs/color'].address, /^pmndrs\/docs\/color#v/)
})

test('native scope uses the installable theme presets and Open in v0 item', () => {
  assert.deepEqual(scope.themePresets.map(({ config }) => config), themePresets.map(({ config }) => config))
  assert.deepEqual(scope.themePresets.map(({ name }) => name), themePresets.map(({ name }) => `theme-${name}`))
  assert.equal(scope.v0Url, v0Link)
  const args = new URL(scope.playgroundUrl).searchParams.get('args')
  assert.ok(args.includes(`source:!hex(${pmndrsMtb.source.slice(1)})`))
  for (const [index, color] of pmndrsMtb.customColors.entries()) {
    assert.ok(args.includes(`customColors[${index}].name:${color.name}`))
    assert.ok(args.includes(`customColors[${index}].hex:!hex(${color.hex.slice(1)})`))
  }
})
