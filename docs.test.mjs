import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { test } from 'node:test'
import config from './docs.config.ts'
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { themePresets } from './registry/md3-base/presets.ts'
import { v0Link } from './scripts/v0.mjs'
import { foundationVariables } from './scripts/foundation-tokens.mjs'

const { components, scope } = config

test('structured token edits reach native documentation and Figma without parsing a page', () => {
  const foundations = structuredClone(scope.foundations)
  const step = foundations.spacing.scale.find(({ step }) => step === '4')
  step.value = '1.25rem'
  step.pixels = 20
  const html = renderToStaticMarkup(createElement(components.FoundationTable, { name: 'spacing.scale', foundations }))
  assert.match(html, /width:1.25rem/)
  assert.match(html, /20px/)
  assert.equal(foundationVariables(foundations).spacing['4'].$value.value, 20)
})

test('native catalog renders installable links and escapes descriptions as text', () => {
  const rows = [{ name: 'example', href: '/r/example.json', address: '@pmndrs/example', description: '<script>test</script>' }]
  const html = renderToStaticMarkup(createElement(components.RegistryCatalog, { rows }))
  assert.match(html, /href="\/r\/example.json"/)
  assert.match(html, /@pmndrs\/example/)
  assert.match(html, /&lt;script&gt;test&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>/)
  const catalog = renderToStaticMarkup(createElement(components.RegistryCatalog, { rows: scope.catalog }))
  assert.match(catalog, /@pmndrs\/theme/)
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
