/**
 * The brand book, `registry/guidelines/brand-book.md`, as the docs site and
 * the `guidelines` item read it: the Guidelines page and `Guidelines.md`, both written by
 * `build.mjs` through `scripts/brand-book.mjs`. `build.test.mjs` holds them
 * current; these hold what being current cannot: that the text reads right
 * where it lands.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }

/**
 * The brand book is written once, in `registry/guidelines/brand-book.md`, and
 * the docs site gets it as the Guidelines page.
 */
const guidelinesPage = () => readFileSync(new URL('./docs/guidelines/introduction.mdx', import.meta.url), 'utf8')

test('the Guidelines page carries every brand-book section', () => {
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
 * Guidelines name CSS custom properties (`--md-sys-color-surface-dim`) or
 * Tailwind classes (`p-4`, `rounded-sm`) so readers can use them directly.
 */
test('the Guidelines page names tokens as CSS custom properties or Tailwind classes', () => {
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

/**
 * Both copies are generated, so each says so at the top, where someone about
 * to edit it looks first, and names the source to edit instead. Out of what a
 * reader sees: an HTML comment in `Guidelines.md`, and in the page a YAML
 * comment in the frontmatter, which pmndrs/docs drops along with the rest of
 * it, where an MDX comment would reach `llms-full.txt` with the body.
 */
test('the Guidelines page and Guidelines.md say they are generated, and from what', () => {
  const marker = /generated from registry\/guidelines\/brand-book\.md by scripts\/build\.mjs: do not edit/i
  const frontmatter = guidelinesPage().match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''
  const file = guidelinesFile()

  assert.ok(frontmatter.split('\n').some((line) => line.startsWith('#') && marker.test(line)), 'no marker in the page frontmatter')
  assert.ok(marker.test(file.match(/^<!--([\s\S]*?)-->\n/)?.[1] ?? ''), 'Guidelines.md does not open on the marker')
})

/** One brand book: what the item installs says what the Guidelines page says. */
test('Guidelines.md carries the text of the Guidelines page', () => {
  const [file] = registry.items.find((item) => item.name === 'guidelines').files
  // Each with its own title and marker: frontmatter on the page, a comment and a `#` heading in the file.
  const body = (text) =>
    text
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .replace(/^<!--[\s\S]*?-->\n/, '')
      .replace(/^\s*# .*\n/, '')
      .trim()

  const markdown = guidelinesPage().match(/^```md\n([\s\S]*?)\n```\n?$/m)?.[1]
  assert.ok(markdown, 'no Markdown block on the Guidelines page')
  assert.equal(body(readFileSync(new URL(file.path, import.meta.url), 'utf8')), markdown.trim())
})

