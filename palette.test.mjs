import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }

/**
 * A framework-free consumer receives only this file. Its declarations must
 * be complete on their own and agree with the colour layer shadcn installs.
 * Comparing parsed declarations also catches accidentally changing selectors
 * or dropping aliases, even if the generated file is current.
 */
test('the standalone palette declares the same light and dark variables as theme', () => {
  const item = registry.items.find(({ name }) => name === 'palette')
  assert.ok(item, 'no `palette` item')
  const [file] = item.files
  const css = readFileSync(new URL(file.path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  assert.deepEqual(blocks.map(([, selector]) => selector.trim()), [':root', '.dark'])

  const parsed = Object.fromEntries(
    blocks.map(([, selector, body]) => [
      selector.trim(),
      Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])),
    ])
  )
  const theme = registry.items.find(({ name }) => name === 'theme-lime').css
  assert.deepEqual(parsed, theme)

  for (const block of Object.values(parsed)) {
    const available = { ...parsed[':root'], ...block }
    for (const value of Object.values(block)) {
      for (const [, reference] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        assert.ok(reference in available, `undefined standalone palette variable ${reference}`)
      }
    }
  }
})

test('the standalone palette requires only a CSS file', () => {
  const item = registry.items.find(({ name }) => name === 'palette')
  assert.ok(item, 'no `palette` item')
  assert.deepEqual(item.files.map(({ type }) => type), ['registry:file'])
  assert.equal(item.files[0].target, '~/src/assets/pmndrs.css')
  for (const field of ['dependencies', 'devDependencies', 'registryDependencies', 'config', 'css', 'cssVars', 'font']) {
    assert.equal(item[field], undefined, `palette unexpectedly installs ${field}`)
  }
  const css = readFileSync(new URL(item.files[0].path, import.meta.url), 'utf8')
  assert.doesNotMatch(css, /@(?:import|plugin|theme|tailwind)\b/)
})
