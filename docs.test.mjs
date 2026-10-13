import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { buildDocs, renderPage } from './scripts/docs.mjs'
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { themePresets } from './registry/md3-base/presets.ts'

function snapshot(dir) {
  return Object.fromEntries(readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [join(entry.parentPath, entry.name), readFileSync(join(entry.parentPath, entry.name))]))
}

test('publishing keeps editorial edits and historical links intact, copies assets and removes stale output', () => {
  const root = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'ds-docs-'))}/`)
  const source = new URL('source/', root)
  const output = new URL('published/', root)
  try {
    cpSync(new URL('./docs/', import.meta.url), source, { recursive: true })
    const page = new URL('tokens/colors.mdx', source)
    const note = '\n## A new heading\n\nAn intentionally pinned example: `pmndrs/design-system/theme#v0.1.0`.\n'
    writeFileSync(page, readFileSync(page, 'utf8') + note)
    const before = snapshot(source)
    buildDocs(source, output)
    assert.deepEqual(snapshot(source), before)
    const colors = readFileSync(new URL('tokens/colors.mdx', output), 'utf8')
    assert.ok(colors.endsWith(note))
    assert.match(colors, /<ThemeSeeds presets=/)
    assert.doesNotMatch(colors, /<ThemePresets\s*\/>/)
    assert.deepEqual(readFileSync(new URL('assets/logo_complete.svg', output)), readFileSync(new URL('assets/logo_complete.svg', source)))
    const catalog = readFileSync(new URL('getting-started/introduction.mdx', output), 'utf8')
    assert.match(catalog, /`@pmndrs\/theme`/)
    writeFileSync(new URL('stale.mdx', output), 'Old page')
    buildDocs(source, output)
    assert.equal(existsSync(new URL('stale.mdx', output)), false)
    assert.deepEqual(snapshot(source), before)
    // A bad reference must not erase the last successful publication.
    writeFileSync(page, '<FoundationTable name="missing" />')
    assert.throws(() => buildDocs(source, output), /Unknown foundation table: missing/)
    assert.equal(readFileSync(new URL('tokens/colors.mdx', output), 'utf8'), colors)
    assert.throws(() => buildDocs(source, source), /must not overlap/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('the palette preview and playground use the installable seed configuration', () => {
  const page = renderPage('<ThemePresets />\n<ThemePlayground />')
  const presets = JSON.parse(page.match(/<ThemeSeeds presets=\{([\s\S]*?)\} \/>/)[1])
  assert.deepEqual(presets.map(({ config }) => config), themePresets.map(({ config }) => config))
  const href = page.match(/<Badge href="([^"]+)"/)[1]
  const args = new URL(href).searchParams.get('args')
  assert.ok(args.includes(`source:!hex(${pmndrsMtb.source.slice(1)})`))
  for (const [index, color] of pmndrsMtb.customColors.entries()) {
    assert.ok(args.includes(`customColors[${index}].name:${color.name}`))
    assert.ok(args.includes(`customColors[${index}].hex:!hex(${color.hex.slice(1)})`))
  }
})
