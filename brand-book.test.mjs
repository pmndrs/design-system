/** The authored Guidelines page and the brand book installed through the registry. */
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }

const guidelinesPage = () => readFileSync(new URL('./docs/guidelines/introduction.mdx', import.meta.url), 'utf8')

test('the Guidelines page carries every shared brand-book section', () => {
  const headings = [...guidelinesPage().matchAll(/^## (.+)$/gm)].map(([, heading]) => heading)

  assert.deepEqual(headings, ['Colour', 'Type', 'Spacing, radii and shadows', 'Components', 'Logo', 'Iconography', 'Voice'])
})

/**
 * MDX reads `{` as the start of an expression and `<` as a tag, and an HTML
 * comment is a syntax error: any of them outside code breaks the docs build,
 * which runs in pmndrs/docs and not in this repo's gate. A `{{placeholder}}`
 * left unfilled is the likeliest way in, a marker left behind the next.
 */
test('the Guidelines page has no placeholder, marker or bare brace or tag left', () => {
  const prose = guidelinesPage()
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/`[^`\n]*`/g, '')
  const offenders = prose.split('\n').filter((line) => /[{}<]/.test(line))

  assert.deepEqual(offenders, [])
})

/**
 * Bare token names (`md-sys-color-surface-dim`, `spacing-4`,
 * `radius-sm`) do not exist in a reader's stylesheet. The page
 * names the CSS custom property (`--md-sys-color-surface-dim`) or the Tailwind
 * class (`p-4`, `rounded-sm`) instead.
 */
test('the Guidelines page uses CSS custom properties and Tailwind utilities', () => {
  const code = [...guidelinesPage().matchAll(/`([^`\n]+)`/g)].map(([, span]) => span)
  const offenders = code.filter((span) => /(^|[\s(,])(md-|spacing\b|spacing-|radius\b|radius-)/.test(span))

  assert.deepEqual(offenders, [])
})

/**
 * Figma Make reads `guidelines/Guidelines.md` at the root of a project, and
 * nowhere else: a target anywhere else installs a file no tool picks up.
 */
test('the guidelines item writes Guidelines.md where Figma Make reads it', () => {
  const guidelines = registry.items.find((item) => item.name === 'guidelines')

  assert.ok(guidelines, 'no `guidelines` item')
  assert.equal(guidelines.type, 'registry:item')
  assert.deepEqual(
    guidelines.files.map(({ type, target }) => ({ type, target })),
    [{ type: 'registry:file', target: '~/guidelines/Guidelines.md' }]
  )
})

const guidelinesFile = () => readFileSync(new URL('./registry/guidelines/Guidelines.md', import.meta.url), 'utf8')

test('the Guidelines page is authored prose and only the registry file is generated', () => {
  assert.doesNotMatch(guidelinesPage(), /Generated from|```md|intended for AI agents/)
  assert.match(guidelinesFile(), /^<!-- Generated from docs\/guidelines\/introduction\.mdx by scripts\/build\.mjs: do not edit\. -->/)
  assert.doesNotMatch(guidelinesFile(), /^---/)
})

test('an author edit reaches the installed Guidelines without rewriting its source', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'guidelines-build-'))
  const root = fileURLToPath(new URL('./', import.meta.url))
  try {
    cpSync(root, fixture, {
      recursive: true,
      filter: (path) => !['.git', 'node_modules', 'out'].includes(path.slice(root.length).split('/')[0]),
    })
    symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'))
    const source = join(fixture, 'docs/guidelines/introduction.mdx')
    const authored = guidelinesPage() + '\nUse accessible labels on every brand control.\n'
    writeFileSync(source, authored)
    execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: fixture, stdio: 'pipe' })
    assert.equal(readFileSync(source, 'utf8'), authored)
    const installed = readFileSync(join(fixture, 'registry/guidelines/Guidelines.md'), 'utf8')
    assert.match(installed, /Use accessible labels on every brand control\./)
    assert.doesNotMatch(installed, /^title:|^nav:|^description:|^---$/m)
    assert.match(installed, /pmndrs\/design-system\/theme#v0\.6\.0/)
    assert.match(installed, /pmndrs\/docs\/mdx-prose#v1\.0\.0/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
