import assert from 'node:assert/strict'
import { test } from 'node:test'
import { builder } from 'material-theme-builder'
import { registryItemSchema } from 'shadcn/schema'
import registry from './registry.json' with { type: 'json' }
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { themePresets } from './registry/md3-base/presets.ts'

function runtimePalette(config) {
  const { source, ...options } = config
  return Object.fromEntries(
    [...builder(source, options).toCss().matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => [
      selector.trim(),
      Object.fromEntries(body.split(';').filter((entry) => entry.trim()).map((entry) => {
        const colon = entry.indexOf(':')
        return [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()]
      })),
    ])
  )
}

test('seven brand presets leave contrast unset and use explicit neutral seeds only for Lime', () => {
  const expected = ['lime', 'teal', 'cyan', 'purple', 'red', 'orange', 'yellow']
  assert.deepEqual(themePresets.map(({ name }) => name), expected)
  const defaultItem = registry.items.find(({ name }) => name === 'theme-lime')
  for (const { name, config } of themePresets) {
    const item = registry.items.find((item) => item.name === `theme-${name}`)
    assert.ok(item, `missing theme-${name}`)
    assert.doesNotThrow(() => registryItemSchema.parse(item))
    assert.deepEqual(item.registryDependencies, defaultItem.registryDependencies)
    const source = pmndrsMtb.customColors.find((color) => color.name === name).hex
    assert.equal(config.source, source)
    assert.equal('contrast' in config, false, name)
    assert.equal('neutral' in config, name === 'lime', name)
    assert.equal('neutralVariant' in config, name === 'lime', name)
    assert.deepEqual(config.customColors, pmndrsMtb.customColors)
    assert.deepEqual(item.css, runtimePalette({
      ...pmndrsMtb,
      source,
      contrast: undefined,
      neutral: name === 'lime' ? pmndrsMtb.neutral : undefined,
      neutralVariant: name === 'lime' ? pmndrsMtb.neutralVariant : undefined,
    }), name)
  }
})

test('successive installations replace every light and dark declaration, including a return to the default', () => {
  const installed = { ':root': {}, '.dark': {} }
  const themes = themePresets.map(({ name }) => registry.items.find((item) => item.name === `theme-${name}`))
  themes.push(registry.items.find(({ name }) => name === 'theme'))
  for (const installedItem of themes) {
    const item = installedItem.name === 'theme'
      ? registry.items.find((item) => item.name === installedItem.registryDependencies[0].split('/').at(-1).split('#')[0])
      : installedItem
    for (const mode of [':root', '.dark']) Object.assign(installed[mode], item.css[mode])
    const config = themePresets.find(({ name }) => item.name === `theme-${name}`).config
    assert.deepEqual(installed, runtimePalette(config), `stale declarations after ${installedItem.name}`)
  }
})
