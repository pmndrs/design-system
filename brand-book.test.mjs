/**
 * The brand book, `artifact/README.md`, as the docs site and the `guidelines`
 * item read it: the Guidelines page and `Guidelines.md`, both written by
 * `build.mjs` through `scripts/brand-book.mjs`. `build.test.mjs` holds them
 * current; these hold what being current cannot: that the text reads right
 * where it lands.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }

/**
 * The brand book is written once, in `artifact/README.md`, and the docs site
 * gets it as the Guidelines page. A passage that only makes sense inside the
 * Claude Design artifact stays out of the page: "Not synced" lists what the
 * artifact does not store, which means nothing on the site.
 */
const guidelinesPage = () => readFileSync(new URL('./docs/guidelines/introduction.mdx', import.meta.url), 'utf8')

test('the Guidelines page carries every brand-book section but the artifact-only ones', () => {
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
 * The artifact names its tokens bare (`md-sys-color-surface-dim`, `spacing-4`,
 * `radius-sm`), and no stylesheet of a site reader's has those names. The page
 * names the CSS custom property (`--md-sys-color-surface-dim`) or the Tailwind
 * class (`p-4`, `rounded-sm`) instead.
 */
test('the Guidelines page names no token the way only the artifact does', () => {
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
  const marker = /generated from artifact\/README\.md by scripts\/build\.mjs: do not edit/i
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

  assert.equal(body(readFileSync(new URL(file.path, import.meta.url), 'utf8')), body(guidelinesPage()))
})

