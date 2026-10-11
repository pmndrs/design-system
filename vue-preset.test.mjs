import assert from 'node:assert/strict'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }
import { readFoundations } from './scripts/foundations.mjs'
import { readRemap } from './scripts/remap.mjs'

const preset = registry.items.find(({ name }) => name === 'preset-vue')

test('the Vue preset selects Vue components and installs its fonts without React', () => {
  assert.ok(preset, 'no `preset-vue` item')
  assert.equal(preset.type, 'registry:base')
  assert.equal(preset.extends, 'none')
  assert.equal(preset.config.style, 'reka-luma')
  assert.equal(preset.config.iconLibrary, 'lucide')
  assert.equal(preset.config.registries['@pmndrs'], 'https://pmndrs.github.io/design-system/r/{name}.json')
  assert.deepEqual(preset.registryDependencies, ['utils'])
  for (const dependency of ['reka-ui', 'lucide-vue-next', '@fontsource-variable/inter', '@fontsource-variable/inconsolata']) {
    assert.ok(preset.dependencies.includes(dependency), `missing ${dependency}`)
  }
  assert.ok(preset.dependencies.every((dependency) => !/^(?:react(?:-dom)?|next|material-theme-builder)(?:$|@)|@base-ui\/react/.test(dependency)))
  assert.ok(preset.css['@import "@fontsource-variable/inter"'])
  assert.ok(preset.css['@import "@fontsource-variable/inconsolata"'])
})

test('the Vue preset has the same palette and stock token roles as theme in both schemes', () => {
  const theme = registry.items.find(({ name }) => name === 'theme').css
  for (const selector of [':root', '.dark']) {
    const colours = Object.fromEntries(Object.entries(preset.css[selector]).filter(([name]) => name.startsWith('--md-')))
    assert.deepEqual(colours, theme[selector])
    for (const { name, role } of readRemap()) {
      assert.equal(preset.css[selector][name], `var(${role})`, `${selector} ${name}`)
      assert.equal(preset.cssVars.theme[`--color-${name.slice(2)}`], `var(${name})`)
    }
  }
})

test('Vue utilities cover MD3 roles, custom colours and the shared foundations', () => {
  const { theme, light } = preset.cssVars
  const palette = registry.items.find(({ name }) => name === 'theme').css[':root']
  for (const name of Object.keys(palette).filter((name) => name.startsWith('--md-sys-color-'))) {
    const role = name.slice('--md-sys-color-'.length)
    if (['background', 'primary', 'secondary'].includes(role)) continue
    assert.equal(theme[`--color-${role}`], `var(${name})`, `missing utility for ${role}`)
  }
  assert.equal(theme['--color-purple-500'], 'var(--md-ref-palette-purple-50)')
  assert.equal(theme['--font-sans'], "'Inter Variable', sans-serif")
  assert.equal(theme['--font-mono'], "'Inconsolata Variable', monospace")
  const { radius } = readFoundations()
  assert.equal(light.radius, radius.base)
  for (const { token, formula } of radius.scale.filter(({ formula }) => formula.includes('var(--radius)'))) {
    assert.equal(theme[token], formula)
  }
  for (const [name, value] of Object.entries(theme).filter(([name]) => name.startsWith('--color-'))) {
    assert.match(value, /^var\(--[\w-]+\)$/, `${name} must reference a shared token`)
  }
})
