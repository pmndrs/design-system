/** Assemble publishable MDX in out/docs without rewriting editorial sources. */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }
import { pmndrsMtb } from '../registry/md3-base/md3.ts'
import { themePresets } from '../registry/md3-base/presets.ts'
import { built } from './build.mjs'
import { externalUrl, renderCatalog } from './catalog.mjs'
import { foundationTables, readFoundations } from './foundations.mjs'
import { v0Link } from './v0.mjs'

const sourceDir = new URL('../docs/', import.meta.url)
const outputDir = new URL('../out/docs/', import.meta.url)
const version = `v${pkg.version}`
const external = JSON.parse(readFileSync(externalUrl, 'utf8'))

function playground() {
  const url = new URL('https://main--695eb517cb602e59b4cc045c.chromatic.com/')
  url.searchParams.set('path', '/story/mtb--st-1')
  url.searchParams.set('nav', 'false')
  const value = (value) => {
    if (typeof value === 'boolean') return `!${value}`
    if (typeof value === 'string' && value.startsWith('#')) return `!hex(${value.slice(1)})`
    return String(value)
  }
  const { customColors, ...core } = pmndrsMtb
  const args = Object.entries(core).map(([key, entry]) => `${key}:${value(entry)}`)
  for (const [index, color] of customColors.entries()) {
    for (const [key, entry] of Object.entries(color)) args.push(`customColors[${index}].${key}:${value(entry)}`)
  }
  url.searchParams.set('args', args.join(';'))
  return `<Badge href="${url.href}" logo="storybook">material theme builder</Badge>`
}

/**
 * Resolve explicit data references, preserving authored prose and literal URLs.
 * Headings and table layout are never inputs to the token build.
 *
 * @param {string} text - Authored MDX.
 * @param {ReturnType<typeof readFoundations>} foundations - Structured token values.
 */
export function renderPage(text, foundations = readFoundations()) {
  const tables = foundationTables(foundations)
  const blocks = {
    ThemePlayground: playground(),
    ThemePresets: `<ThemeSeeds presets={${JSON.stringify(themePresets.map(({ name, ...preset }) => ({ name: `theme-${name}`, ...preset })), null, 2)}} />`,
    RegistryCatalog: renderCatalog([{ repo: 'pmndrs/design-system', ref: version, items: built.items }, ...external]),
  }
  const values = { release: version, v0Url: v0Link }
  return text
    .replace(/<(ThemePlayground|ThemePresets|RegistryCatalog)\s*\/>/g, (_, name) => blocks[name])
    .replace(/<FoundationTable name="([^"]+)"\s*\/>/g, (_, name) => {
      if (!Object.hasOwn(tables, name)) throw new Error(`Unknown foundation table: ${name}`)
      return tables[name]
    })
    .replace(/\{\{(release|v0Url)\}\}/g, (_, name) => values[name])
}

/**
 * Create a fresh documentation directory, including assets, outside its source.
 *
 * @param {URL} source - Authored documentation directory.
 * @param {URL} output - Disposable publication directory.
 */
export function buildDocs(source = sourceDir, output = outputDir) {
  const from = resolve(fileURLToPath(source))
  const to = resolve(fileURLToPath(output))
  const contains = (parent, child) => {
    const path = relative(parent, child)
    return path === '' || (!path.startsWith('..') && !path.startsWith('/'))
  }
  if (contains(from, to) || contains(to, from)) throw new Error('Documentation source and output must not overlap')
  const foundations = readFoundations()
  // Render before replacing the previous output, so a bad reference leaves it intact.
  const files = readdirSync(source, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => {
    const path = relative(from, resolve(entry.parentPath, entry.name))
    const input = resolve(from, path)
    return { path, input, text: path.endsWith('.mdx') ? renderPage(readFileSync(input, 'utf8'), foundations) : null }
  })
  rmSync(output, { recursive: true, force: true })
  for (const { path, input, text } of files) {
    const target = new URL(path, output)
    mkdirSync(new URL('./', target), { recursive: true })
    if (text === null) copyFileSync(input, target)
    else writeFileSync(target, text)
  }
}

if (import.meta.main) {
  buildDocs()
  console.log('Documentation prepared in out/docs')
}
