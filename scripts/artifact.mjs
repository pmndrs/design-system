/**
 * Generates the files of the Poimandres Design System artifact,
 * https://claude.ai/artifact/FF46zANDT1mt2kdF9D9QAf, into `out/artifact/`
 * (gitignored). `out/artifact/project/` mirrors the artifact's own `project/`:
 *
 *   tokens.json                 the tokens, as the artifact reads them: a list
 *                               per family, colour in a light and a dark theme
 *   README.md                   the brand book a design agent reads first
 *   fonts/*.woff2               Inter and Inconsolata
 *   assets/Logos/README.md      how to use the logo assets
 *   components/<Block>/*        one card per block of the registry catalog
 *                               (`docs/getting-started/introduction.mdx`), a
 *                               `preview.html` and a `README.md` each
 *
 * The artifact draws the foundations itself, colours to shadows, from
 * tokens.json: its Components section is the catalog's blocks and nothing
 * else. A block's card is hand-written, a static rendition of the component,
 * and the build fails on a catalog block without one.
 *
 * The maintainer then publishes the files that changed, from Claude Code's
 * Artifact tool (see the README's "Claude Design" section). What the artifact
 * generates itself is not written here: `tokens.css`, `manifest.json`, `api/`.
 * Nor is its index, `design-system.json`, which names the logo uploads and is
 * edited at publish time.
 *
 * Where each file comes from:
 *
 *   registry.json                    the baked palette, and this repo's
 *                                    items in the catalog
 *   registry/external.json           the other repos' items in the catalog
 *   material-theme-builder           the shadcn remap
 *   docs/<page>/introduction.mdx     the type scale, the spacing, radius and
 *                                    shadow tables, the font families
 *   tailwindcss                      the mono fallback stack, the one value
 *                                    no docs page lists
 *   @fontsource-variable/*           the font files and their weight ranges
 *   scripts/artifact.notes.json      what no source says: each token's usage
 *                                    line, the family notes, the provenance
 *                                    block and the few external pins
 *   artifact/                        the hand-written files (the brand book,
 *                                    the block cards, the logo notes), copied
 *                                    with their `{{placeholders}}` filled
 *
 * Every version and sha in the output is one of those placeholders, filled
 * from git, `package.json`, `node_modules` and `registry/external.json`, so a
 * run from a release's sources is that release's design system.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }
import registry from '../registry.json' with { type: 'json' }
import external from '../registry/external.json' with { type: 'json' }
import notes from './artifact.notes.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
/** Where `npm run artifact` writes. */
export const outDir = new URL('../out/artifact/', import.meta.url)
/** The hand-written files, laid out as they are published. */
const sourceDir = new URL('../artifact/', import.meta.url)

const item = (name) => registry.items.find((entry) => entry.name === name)
const resolvePath = (id) => fileURLToPath(import.meta.resolve(id))

/* ------------------------------------------------------------------------ */
/* Sources                                                                    */
/* ------------------------------------------------------------------------ */

/** A foundation page of the docs, cut at its `##` headings. */
function readPage(dir) {
  const text = readFileSync(new URL(`../docs/${dir}/introduction.mdx`, import.meta.url), 'utf8')
  const [, ...chunks] = text.split(/^## /m)

  return {
    dir,
    text,
    sections: chunks.map((chunk) => ({
      heading: chunk.slice(0, chunk.indexOf('\n')).trim(),
      body: chunk,
    })),
  }
}

const section = (page, heading) => {
  const found = page.sections.find((entry) => entry.heading === heading)
  if (!found) throw new Error(`docs/${page.dir} has no "## ${heading}" section`)
  return found
}

/**
 * The rows of the first markdown table in `markdown`, header and separator
 * dropped, each cell unwrapped from its backticks. Throws rather than return
 * nothing: an empty table here is a token family with nothing in it.
 */
function tableRows(markdown) {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => line.startsWith('|'))
  const end = lines.findIndex((line, index) => index > start && !line.startsWith('|'))
  const rows = lines
    .slice(start + 2, end === -1 ? undefined : end)
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim().replace(/^`([^`]*)`$/, '$1'))
    )
  if (start === -1 || !rows.length) throw new Error(`no table in:\n${markdown.slice(0, 200)}`)
  return rows
}

const pages = Object.fromEntries(
  ['typography', 'spacing', 'radius', 'shadows'].map((dir) => [dir, readPage(dir)])
)

/** The baked palette, as `theme` installs it: `:root` and the `.dark` overrides. */
const palette = item('theme').css
const light = palette[':root']
const dark = palette['.dark']

/**
 * The shadcn remap: every shadcn variable and the MD3 role it points at, read
 * from the stylesheet `md3-base` imports.
 */
const remapCss = readFileSync(resolvePath('material-theme-builder/shadcn.css'), 'utf8')
const remap = [...remapCss.matchAll(/^\s*--([\w-]+):\s*var\(--md-sys-color-([\w-]+)\);/gm)].map(([, name, role]) => ({
  name,
  role,
}))

/** Every MD3 role the palette defines, `surface-dim`, `on-lime`, …, in its order. */
const roles = Object.keys(light)
  .filter((name) => name.startsWith('--md-sys-color-'))
  .map((name) => name.slice('--md-sys-color-'.length))

/**
 * The tonal palettes, each with its tones in the palette's order. A palette
 * name can hold a dash (`neutral-variant`), so the tone is the last segment.
 */
const ramps = new Map()
for (const name of Object.keys(light)) {
  const match = name.match(/^--md-ref-palette-(.+)-(\d+)$/)
  if (!match) continue
  const [, ramp, tone] = match
  if (!ramps.has(ramp)) ramps.set(ramp, [])
  ramps.get(ramp).push(tone)
}

/**
 * Tailwind's own defaults, from its first `@theme default` block, for the one
 * value no docs page lists: the mono fallback stack.
 */
const tailwindThemeCss = readFileSync(resolvePath('tailwindcss/theme.css'), 'utf8')
const tailwindDefaults = Object.fromEntries(
  [...tailwindThemeCss.slice(0, tailwindThemeCss.indexOf('\n}\n')).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(
    ([, name, value]) => [name, value.replace(/\s+/g, ' ').trim()]
  )
)

/** The two families, from the Typography page: `Inter` on `--font-sans`, … */
const fonts = tableRows(section(pages.typography, 'Font family').body).map(([role, family, utility, variable]) => ({
  role,
  family,
  utility,
  variable,
  key: variable.slice('--font-'.length),
}))

/** `x.y.z` of an installed package. */
const installedVersion = (name) =>
  JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8')).version

const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), encoding: 'utf8' }).trim()

/**
 * The commit the artifact is generated from: `origin/main`, which a publish
 * after a release has checked out, or `HEAD` where there is no such ref (a
 * CI checkout).
 */
function sourceCommit() {
  for (const ref of ['origin/main', 'HEAD']) {
    try {
      return { sha: git('rev-parse', '--short', ref), date: git('log', '-1', '--format=%cs', ref) }
    } catch {}
  }
  throw new Error('no commit to name the artifact after')
}

/**
 * The values of the `{{placeholders}}`: every version or sha the output names
 * comes from one of these. The release is `package.json`'s version, which
 * Changesets bumps and the release workflow tags.
 */
const fontsourceVersions = [...new Set(fonts.map(({ family }) => installedVersion(`@fontsource-variable/${family.toLowerCase()}`)))]
if (fontsourceVersions.length !== 1) throw new Error(`the font packages disagree: ${fontsourceVersions.join(', ')}`)
const commit = sourceCommit()
export const placeholders = {
  sha: commit.sha,
  synced: commit.date,
  release: `v${pkg.version}`,
  docsRef: external.find(({ repo }) => repo === 'pmndrs/docs').ref,
  fontsourceVersion: fontsourceVersions[0],
  mtbVersion: installedVersion('material-theme-builder'),
  ...notes.pins,
}

/** `text` with its `{{name}}` placeholders filled. Throws on an unknown one. */
function fill(text, where) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (!(name in placeholders)) throw new Error(`${where}: unknown placeholder ${match}`)
    return placeholders[name]
  })
}

/* ------------------------------------------------------------------------ */
/* tokens.json                                                                */
/* ------------------------------------------------------------------------ */

/** `spacing-{step}` as a pattern: `{step}` matches one dash-free segment. */
const patternOf = (key) =>
  new RegExp(`^${key.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, '(?<$1>[\\w.]+)')}$`)

/**
 * A token's usage line, from `artifact.notes.json`: its own entry, or the
 * first pattern entry its name matches, `{…}` filled from the name and from
 * `vars`. Throws when there is none: a token without a usage line is one a
 * design agent cannot place.
 */
function usage(family, name, vars = {}) {
  const lines = notes.families[family].usage
  if (lines[name]) return lines[name]
  for (const [key, line] of Object.entries(lines)) {
    const match = key.includes('{') && patternOf(key).exec(name)
    if (match) return line.replace(/\{(\w+)\}/g, (_, part) => match.groups[part] ?? vars[part])
  }
  throw new Error(`${family} token ${name} has no usage line in scripts/artifact.notes.json`)
}

/** A palette value as a token value: `var(--x)` is the alias `{x}`, a hex is lowercased. */
function colorValue(value) {
  const alias = value.match(/^var\(--([\w-]+)\)$/)?.[1]
  return alias ? `{${alias}}` : value.toLowerCase()
}

/**
 * The colour tokens: the shadcn tokens, aliased as the remap points them;
 * the MD3 roles, light and dark (light only for a role the dark scheme does
 * not override); and the tonal palettes, one value for both schemes.
 */
function colorTokens() {
  const unexpected = Object.keys(light).filter((name) => !/^--md-(sys-color|ref-palette)-/.test(name))
  if (unexpected.length) throw new Error(`the theme item declares unexpected variables: ${unexpected.join(' ')}`)

  return [
    ...remap.map(({ name, role }) => ({ name, value: `{md-sys-color-${role}}`, usage: usage('color', name) })),
    ...roles.map((role) => {
      const name = `md-sys-color-${role}`
      const value = { light: colorValue(light[`--${name}`]) }
      if (dark[`--${name}`]) value.dark = colorValue(dark[`--${name}`])
      return { name, value, usage: usage('color', name) }
    }),
    ...[...ramps].flatMap(([ramp, tones]) =>
      tones.map((tone) => {
        const name = `md-ref-palette-${ramp}-${tone}`
        return { name, value: colorValue(light[`--${name}`]), usage: usage('color', name) }
      })
    ),
  ]
}

/** `16px` as `1rem`. */
const rem = (pixels) => `${parseFloat(pixels) / 16}rem`

/** Tailwind's weight names, for the one recipe class that sets a weight. */
const weights = { normal: 400, medium: 500, semibold: 600, bold: 700 }

/**
 * The type scale, from the Typography page: `0.75rem (12px)` and
 * `calc(1 / 0.75) (16px)` become `0.75rem` and `1rem`; a unitless line
 * height, `1`, stays a number.
 */
const typeScale = tableRows(section(pages.typography, 'Type scale').body).map(([utility, size, leading]) => {
  const unitless = leading.match(/^`(\d+(?:\.\d+)?)`/)?.[1]
  return {
    name: utility,
    fontSize: size.match(/^`([^`]+)`/)[1],
    lineHeight: unitless ? Number(unitless) : rem(leading.match(/\((\d+)px\)/)[1]),
    pixels: { fontSize: parseFloat(size.match(/\((\d+)px\)/)[1]), lineHeight: parseFloat(leading.match(/\((\d+)px\)/)[1]) },
  }
})

/**
 * Inline code, the one element of shadcn's recipe with a style of its own:
 * its `font-mono`, its `text-*` step and its weight, read off the recipe's
 * classes on the Typography page.
 */
function inlineCode() {
  const recipe = section(pages.typography, 'Elements').body.split('### Inline code')[1]
  const classes = recipe.match(/```tsx\n<code className="([^"]*)"/)[1].split(/\s+/)
  const step = typeScale.find(({ name }) => classes.includes(name))
  const weight = classes.map((name) => weights[name.replace(/^font-/, '')]).find(Boolean)
  const family = fonts.find(({ utility }) => classes.includes(utility))
  return { family: family.key, style: { name: 'code-inline', fontSize: step.fontSize, lineHeight: step.lineHeight, fontWeight: weight } }
}

/** The font file of a family: its latin, variable-weight subset from Fontsource. */
function fontFile({ family }) {
  const id = family.toLowerCase()
  const css = readFileSync(resolvePath(`@fontsource-variable/${id}/index.css`), 'utf8')
  const face = css.split(`/* ${id}-latin-wght-normal */`)[1]
  return {
    family,
    file: `fonts/${id}-latin-wght-normal.woff2`,
    weight: face.match(/font-weight:\s*([^;]+);/)[1],
    style: 'normal',
    source: resolvePath(`@fontsource-variable/${id}/files/${id}-latin-wght-normal.woff2`),
  }
}
const fontFiles = fonts.map(fontFile)

function typeTokens() {
  const code = inlineCode()
  /**
   * The preset writes `sans-serif` behind Inter; Tailwind's stack backs the
   * mono family, its quotes doubled as the artifact writes them.
   */
  const fallback = { sans: 'sans-serif', mono: tailwindDefaults['--font-mono'].replaceAll("'", '"') }
  const sans = fonts.find(({ key }) => key === 'sans')
  return {
    fonts: fontFiles.map(({ family, file, weight, style }) => ({ family, file, weight, style })),
    families: Object.fromEntries(fonts.map(({ key, family }) => [key, `${family}, ${fallback[key]}`])),
    groups: [
      {
        name: 'Text',
        family: sans.key,
        styles: typeScale.map(({ name, fontSize, lineHeight }) => ({
          name,
          fontSize,
          lineHeight,
          fontWeight: weights.normal,
          usage: usage('type', name),
        })),
      },
      { name: 'Code', family: code.family, styles: [{ ...code.style, usage: usage('type', code.style.name) }] },
    ],
  }
}

/** The base unit and the steps of the Spacing page; `0` and `px` are not multiples of it. */
const spacingBase = tableRows(section(pages.spacing, 'Base unit').body)[0][1]
const spacingScale = tableRows(section(pages.spacing, 'Scale').body).map(([step, value, pixels]) => ({ step, value, pixels }))

function spacingTokens() {
  return [
    { name: 'spacing', value: spacingBase, usage: usage('spacing', 'spacing') },
    ...spacingScale
      .filter(({ step }) => Number(step) > 0)
      .map(({ step, value, pixels }) => ({ name: `spacing-${step}`, value, usage: usage('spacing', `spacing-${step}`, { pixels }) })),
  ]
}

/**
 * `--radius` and the scale of the Radius page: the base-nova steps, and
 * `--radius-xs`, Tailwind's, which the page lists as inherited.
 */
const radius = pages.radius.text.match(/^\s*--radius:\s*([^;]+);/m)[1]
const radii = tableRows(section(pages.radius, 'Scale').body).map(([token, utility, formula, value]) => ({
  token,
  utility,
  formula,
  value,
}))

/** `radius`, then every step of the Radius page, in its order. */
function radiusTokens() {
  return [
    { name: 'radius', value: radius, usage: usage('radius', 'radius') },
    ...radii.map(({ token, value }) => {
      const name = token.slice(2)
      return { name, value, usage: usage('radius', name) }
    }),
  ]
}

/**
 * A shadow table of the Shadows page as tokens. `rgb(0 0 0 / 0.05)` is
 * written `rgba(0, 0, 0, 0.05)`: the artifact takes colour functions with
 * plain numeric arguments.
 */
const shadowRows = (heading) =>
  tableRows(section(pages.shadows, heading).body).map(([utility, , value]) => ({
    name: utility,
    value: value.replace(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/g, 'rgba($1, $2, $3, $4)'),
  }))

const shadowTokens = (family, headings) =>
  headings.flatMap(shadowRows).map(({ name, value }) => ({ name, value, usage: usage(family, name) }))

/** tokens.json, its keys in the artifact's own order. */
function tokens() {
  const note = (family) => notes.families[family].note
  return {
    name: 'Poimandres',
    version: 1,
    color: {
      themes: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' },
      ],
      tokens: colorTokens(),
    },
    type: typeTokens(),
    meta: JSON.parse(fill(JSON.stringify(notes.meta), 'meta')),
    spacing: { tokens: spacingTokens(), note: note('spacing') },
    radius: { tokens: radiusTokens(), note: note('radius') },
    shadow: { tokens: shadowTokens('shadow', ['Box shadow', 'Inset shadow']), note: note('shadow') },
    dropShadow: { note: note('dropShadow'), tokens: shadowTokens('dropShadow', ['Drop shadow']) },
  }
}

/* ------------------------------------------------------------------------ */
/* Components                                                                 */
/* ------------------------------------------------------------------------ */

/** Every file of `dir`, relative to it, sorted. */
const walk = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((name) => statSync(new URL(name, dir)).isFile())
    .sort()

/**
 * The blocks of the registry catalog, by name: the `registry:block` items of
 * this repo and of the repos `registry/external.json` lists, the same two
 * sources `catalog.mjs` writes the docs table from.
 */
export const catalogBlocks = [registry, ...external].flatMap(({ items }) =>
  items.filter(({ type }) => type === 'registry:block').map(({ name }) => name)
)

/** A block's folder under `components/`: `keypoints` is `Keypoints`, `color-group` `ColorGroup`. */
export const componentName = (block) =>
  block
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

/**
 * What is wrong with the hand-written components, given the catalog's
 * `blocks` and the `paths` of `artifact/`: a block without its `README.md` or
 * `preview.html`, or a folder of `components/` that is no block of the
 * catalog. Empty when the components mirror the catalog.
 *
 * @param {string[]} blocks
 * @param {string[]} paths
 * @returns {string[]}
 */
export function componentProblems(blocks, paths) {
  const names = blocks.map(componentName)
  const missing = names
    .flatMap((name) => [`components/${name}/README.md`, `components/${name}/preview.html`])
    .filter((path) => !paths.includes(path))
    .map((path) => `artifact/${path} is missing: every block of the catalog has a hand-written card`)
  const folders = new Set(paths.filter((path) => path.startsWith('components/')).map((path) => path.split('/')[1]))
  const strays = [...folders]
    .filter((folder) => !names.includes(folder))
    .map((folder) => `artifact/components/${folder} is no block of the catalog`)
  return [...missing, ...strays]
}

const sourcePaths = walk(sourceDir)
const problems = componentProblems(catalogBlocks, sourcePaths)
if (problems.length) throw new Error(problems.join('\n'))

/* ------------------------------------------------------------------------ */
/* Outputs                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Every file the script writes, as `[path, content]`, `path` relative to the
 * output folder's `project/`. Exported rather than written on import, as
 * `build.mjs` does, so `artifact.test.mjs` can write them where it checks
 * them.
 */
export const outputs = [
  ['tokens.json', `${JSON.stringify(tokens(), null, 2)}\n`],
  ...sourcePaths.map((path) => [path, fill(readFileSync(new URL(path, sourceDir), 'utf8'), `artifact/${path}`)]),
  ...fontFiles.map(({ file, source }) => [file, readFileSync(source)]),
].sort(([a], [b]) => a.localeCompare(b))

/** Writes `outputs` into `dir/project/`, emptied first: a file no source produces any more must not linger. */
export function writeArtifact(dir) {
  rmSync(dir, { recursive: true, force: true })
  for (const [path, content] of outputs) {
    const url = new URL(`project/${path}`, dir)
    mkdirSync(new URL('./', url), { recursive: true })
    writeFileSync(url, content)
  }
}

if (import.meta.main) {
  writeArtifact(outDir)
  console.log(`built ${outputs.length} files into ${outDir.pathname.replace(root.pathname, '')}project/`)
}
