/**
 * What `npm run hosted-registry` writes for the docs site's `r/` folder: the
 * static registry a `components.json` namespace and the shadcn MCP server
 * read. These run the writer into a temporary folder and assert what a
 * consumer fetches from there, against `registry.json`, not how
 * `scripts/hosted-registry.mjs` produces it.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { registryItemSchema, registrySchema } from 'shadcn/schema'
import pkg from './package.json' with { type: 'json' }
import registry from './registry.json' with { type: 'json' }
import { hostedUrl, writeHostedRegistry } from './scripts/hosted-registry.mjs'

const out = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'hosted-registry-'))}/`)
// An item removed since the last run: its file must not linger.
writeFileSync(new URL('removed-item.json', out), '{}')
const written = writeHostedRegistry(out)
after(() => rmSync(out, { recursive: true, force: true }))

const files = readdirSync(out).sort()

test('one JSON per registry.json item, plus the index, and nothing left from an earlier run', () => {
  const expected = [...registry.items.map(({ name }) => `${name}.json`), 'registry.json'].sort()
  assert.deepEqual(files, expected)
  assert.deepEqual([...written].sort(), expected)
})

const read = (file) => JSON.parse(readFileSync(new URL(file, out), 'utf8'))

/**
 * A namespace's list and search, in the CLI and the MCP server, fetch the
 * item named `registry`: the index, parsed as a registry, which needs `name`
 * and `homepage` and every item resolved (no `include`).
 */
test('the index is a resolved registry that lists every item', () => {
  const index = registrySchema.parse(read('registry.json'))
  assert.equal(index.include, undefined)
  assert.deepEqual(
    index.items.map(({ name }) => name),
    registry.items.map(({ name }) => name)
  )
})

/**
 * What `shadcn add @pmndrs/<name>` installs is the hosted item, so it must be
 * the committed one: every field as it is, and every file's content the file
 * at its `path`.
 */
test('every item file is a valid shadcn item that round-trips the source item', () => {
  for (const source of registry.items) {
    const hosted = read(`${source.name}.json`)
    assert.doesNotThrow(() => registryItemSchema.parse(hosted), source.name)

    const { $schema, files = [], ...fields } = hosted
    assert.equal($schema, 'https://ui.shadcn.com/schema/registry-item.json')
    const { files: sourceFiles = [], ...sourceFields } = source
    assert.deepEqual(fields, sourceFields, source.name)

    assert.deepEqual(
      files.map(({ content, ...file }) => file),
      sourceFiles,
      source.name
    )
    for (const { path, content } of files) {
      assert.equal(content, readFileSync(new URL(path, import.meta.url), 'utf8'), `${source.name}: ${path}`)
    }
  }
})

/**
 * A hosted item keeps its dependencies on this registry as pinned GitHub
 * addresses, which resolve from anywhere: each must name an item the hosted
 * registry serves, at this release's tag. A hosted URL dependency must name a
 * served item too.
 */
test('every dependency on this registry points at an item it serves, at this release', () => {
  const served = new Set(files.map((file) => file.replace(/\.json$/, '')))
  const problems = []
  for (const file of files.filter((file) => file !== 'registry.json')) {
    for (const dependency of read(file).registryDependencies ?? []) {
      const github = dependency.match(/^pmndrs\/design-system\/([^#]+)#(.+)$/)
      if (github) {
        const [, name, ref] = github
        if (!served.has(name)) problems.push(`${file}: ${dependency} names no served item`)
        if (ref !== `v${pkg.version}`) problems.push(`${file}: ${dependency} is not at v${pkg.version}`)
      }
      if (dependency.startsWith(hostedUrl)) {
        const name = dependency.slice(hostedUrl.length).replace(/\.json$/, '')
        if (!served.has(name) || name === 'registry') problems.push(`${file}: ${dependency} names no served item`)
      }
    }
  }
  assert.deepEqual(problems, [])
})

/**
 * What v0 fetches when an "Open in v0" link is followed: the hosted `v0`
 * item. It has to stand on its own there, since v0 drops `css` and `cssVars`
 * and resolves neither a namespace nor a GitHub address: every file inlined,
 * the stylesheet with literal colours, and nothing to resolve but absolute
 * URLs.
 */
test('the hosted v0 item carries its files inline, with nothing v0 cannot resolve', () => {
  const hosted = read('v0.json')

  assert.equal(hosted.css, undefined)
  assert.equal(hosted.cssVars, undefined)
  assert.deepEqual(
    (hosted.registryDependencies ?? []).filter((dependency) => !dependency.startsWith('https://')),
    []
  )
  for (const target of ['app/globals.css', 'app/layout.tsx', 'app/page.tsx', 'public/pmndrs/logo_complete.svg', 'guidelines/Guidelines.md']) {
    const file = hosted.files.find((entry) => entry.target === target)
    assert.ok(file?.content, `no ${target} inline`)
  }
  const { content } = hosted.files.find((entry) => entry.target === 'app/globals.css')
  assert.match(content, /^:root \{[^}]*--primary: #[0-9a-f]{6};/m)
  assert.match(content, /^:root \{[^}]*--md-sys-color-primary-container: #[0-9a-f]{6};/m)
  assert.match(content, /^\.dark \{[^}]*--primary: #[0-9a-f]{6};/m)
})

/**
 * The "Open in v0" links the README and the getting-started page hand out:
 * each has to open the item above, at the address the docs site serves it.
 */
test('every Open in v0 link opens the hosted v0 item', () => {
  for (const page of ['README.md', 'docs/getting-started/introduction.mdx']) {
    const text = readFileSync(new URL(page, import.meta.url), 'utf8')
    const links = [...text.matchAll(/https:\/\/v0\.app\/chat\/api\/open\?[^\s)"']+/g)].map(([link]) => new URL(link))

    assert.ok(links.length, `${page} has no Open in v0 link`)
    for (const link of links) {
      const url = link.searchParams.get('url')
      assert.equal(url, `${hostedUrl}v0.json`, `${page}: ${link}`)
      assert.ok(files.includes(url.slice(hostedUrl.length)), `${page}: ${url} is not served`)
    }
  }
})

/**
 * `shadcn init` with the hosted `preset` writes its `config` into
 * `components.json`, so the project it starts has the namespace declared,
 * at the address these files are served from.
 */
test('the hosted preset declares the namespace it is served from', () => {
  const { registries } = read('preset.json').config

  assert.equal(registries['@pmndrs'].replace('{name}', 'preset'), `${hostedUrl}preset.json`)
})

/** The index is the item named `registry`, so an item of that name would overwrite it. */
test('an item named registry is refused', () => {
  const dir = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'hosted-registry-clash-'))}/`)
  after(() => rmSync(dir, { recursive: true, force: true }))
  const source = new URL('registry.json', dir)
  writeFileSync(source, JSON.stringify({ ...registry, items: [{ name: 'registry', type: 'registry:item' }] }))
  assert.throws(() => writeHostedRegistry(new URL('r/', dir), source), /registry/)
})
