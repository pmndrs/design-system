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
 *                                    shadow tables, the font families, read
 *                                    through `foundations.mjs`
 *   tailwindcss                      the mono fallback stack, the one value
 *                                    no docs page lists
 *   @fontsource-variable/*           the font files and their weight ranges
 *   scripts/artifact.notes.json      what no source says: each token's usage
 *                                    line, the family notes, the provenance
 *                                    block and the few external pins
 *   artifact/                        the hand-written files (the brand book,
 *                                    the block cards, the logo notes), copied
 *                                    with their `{{placeholders}}` filled and
 *                                    their artifact-only markers removed (see
 *                                    `brand-book.mjs`)
 *
 * Every version and sha in the output is one of those placeholders, filled
 * from git, `package.json`, `node_modules` and `registry/external.json`, so a
 * run from a release's sources is that release's design system.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import registry from '../registry.json' with { type: 'json' }
import external from '../registry/external.json' with { type: 'json' }
import notesSource from './artifact.notes.json' with { type: 'json' }
import { fill as fillPlaceholders, placeholders as sharedPlaceholders, unmarkArtifactOnly } from './brand-book.mjs'
import { commaRgba, readFoundations, readPage, section } from './foundations.mjs'
import { installedVersion } from './packages.mjs'
import { readRemap } from './remap.mjs'

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

/** The foundations values of the docs pages, and the Typography page for its recipe. */
const foundations = readFoundations()
const typographyPage = readPage('typography')

/** The baked palette, as `theme` installs it: `:root` and the `.dark` overrides. */
const palette = item('theme').css
const light = palette[':root']
const dark = palette['.dark']

/**
 * The shadcn remap: every shadcn variable and the MD3 role it points at, read
 * from the stylesheet `md3-base` imports, both named as the artifact names a
 * token: `card` and `surface-container-low`.
 */
const remap = readRemap().map(({ name, role }) => ({ name: name.slice(2), role: role.slice('--md-sys-color-'.length) }))

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
const fonts = foundations.typography.fonts.map((font) => ({ ...font, key: font.variable.slice('--font-'.length) }))

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
 * comes from one of these. The shared ones are `brand-book.mjs`'s, the same
 * the build fills the Guidelines page with; the source commit and the font
 * package version are the artifact's own, and only artifact-only passages name
 * them.
 */
const fontsourceVersions = [...new Set(fonts.map(({ family }) => installedVersion(`@fontsource-variable/${family.toLowerCase()}`)))]
if (fontsourceVersions.length !== 1) throw new Error(`the font packages disagree: ${fontsourceVersions.join(', ')}`)
const commit = sourceCommit()
export const placeholders = {
  ...sharedPlaceholders,
  sha: commit.sha,
  synced: commit.date,
  fontsourceVersion: fontsourceVersions[0],
}

/** `text` with its `{{name}}` placeholders filled. Throws on an unknown one. */
const fill = (text, where) => fillPlaceholders(text, where, placeholders)

/** `artifact.notes.json`, its `{{placeholders}}` filled. */
const notes = JSON.parse(fill(JSON.stringify(notesSource), 'scripts/artifact.notes.json'))

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
 * The type scale, from the Typography page: a `calc(1 / 0.75)` line height
 * becomes its pixels in rem, `1rem`; a unitless one, `1`, stays a number.
 */
const typeScale = foundations.typography.scale.map(({ utility, fontSize, lineHeight, pixels }) => ({
  name: utility,
  fontSize,
  lineHeight: /^\d+(?:\.\d+)?$/.test(lineHeight) ? Number(lineHeight) : rem(pixels.lineHeight),
}))

/**
 * Inline code, the one element of shadcn's recipe with a style of its own:
 * its `font-mono`, its `text-*` step and its weight, read off the recipe's
 * classes on the Typography page.
 */
function inlineCode() {
  const recipe = section(typographyPage, 'Elements').body.split('### Inline code')[1]
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
const { base: spacingBase, scale: spacingScale } = foundations.spacing

function spacingTokens() {
  return [
    { name: 'spacing', value: spacingBase, usage: usage('spacing', 'spacing') },
    ...spacingScale
      .filter(({ step }) => Number(step) > 0)
      .map(({ step, value, pixels }) => ({ name: `spacing-${step}`, value, usage: usage('spacing', `spacing-${step}`, { pixels: `${pixels}px` }) })),
  ]
}

/**
 * `--radius` and the scale of the Radius page: the preset style's steps, and
 * `--radius-xs`, Tailwind's, which the page lists as inherited.
 */
const { base: radius, scale: radii } = foundations.radius

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
 * A shadow family of the Shadows page, `box`, `inset` or `drop`, as tokens. `rgb(0 0 0 / 0.05)` is
 * written `rgba(0, 0, 0, 0.05)`: the artifact takes colour functions with
 * plain numeric arguments.
 */
const shadowRows = (family) =>
  foundations.shadows[family].map(({ utility, value }) => ({
    name: utility,
    value: commaRgba(value),
  }))

const shadowTokens = (family, shadowFamilies) =>
  shadowFamilies.flatMap(shadowRows).map(({ name, value }) => ({ name, value, usage: usage(family, name) }))

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
    meta: notes.meta,
    spacing: { tokens: spacingTokens(), note: note('spacing') },
    radius: { tokens: radiusTokens(), note: note('radius') },
    shadow: { tokens: shadowTokens('shadow', ['box', 'inset']), note: note('shadow') },
    dropShadow: { note: note('dropShadow'), tokens: shadowTokens('dropShadow', ['drop']) },
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
  ...sourcePaths.map((path) => [path, fill(unmarkArtifactOnly(readFileSync(new URL(path, sourceDir), 'utf8')), `artifact/${path}`)]),
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
