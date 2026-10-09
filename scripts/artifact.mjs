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
 *   components/Keypoints/*      the first pmndrs block
 *   components/<Card>/*         one card per foundation of the docs, a
 *                               `preview.html` and a `README.md` each
 *
 * The maintainer then publishes the files that changed, from Claude Code's
 * Artifact tool (see the README's "Claude Design" section). What the artifact
 * generates itself is not written here: `tokens.css`, `manifest.json`, `api/`.
 * Nor is its index, `design-system.json`, which names the logo uploads and is
 * edited at publish time.
 *
 * Where each file comes from:
 *
 *   registry.json                    the baked palette and the logo files
 *   registry/md3-base/md3.ts         the names of the brand colours
 *   material-theme-builder           the shadcn remap
 *   docs/<page>/introduction.mdx     the type scale, the spacing, radius and
 *                                    shadow tables, the font families, the
 *                                    logo variants, and which of them are
 *                                    inherited
 *   tailwindcss                      the mono fallback stack and `radius-xs`,
 *                                    the two values no docs page lists
 *   @fontsource-variable/*           the font files and their weight ranges
 *   scripts/artifact.notes.json      what no source says: each token's usage
 *                                    line, the family notes, the provenance
 *                                    block and the few external pins
 *   artifact/                        the hand-written files (the brand book,
 *                                    Keypoints, the logo notes), copied with
 *                                    their `{{placeholders}}` filled
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
import { pmndrsMtb } from '../registry/md3-base/md3.ts'
import notes from './artifact.notes.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
/** Where `npm run artifact` writes. */
export const outDir = new URL('../out/artifact/', import.meta.url)
/** The hand-written files, laid out as they are published. */
const sourceDir = new URL('../artifact/', import.meta.url)

const item = (name) => registry.items.find((entry) => entry.name === name)
const resolvePath = (id) => fileURLToPath(import.meta.resolve(id))
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/* ------------------------------------------------------------------------ */
/* Sources                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * A foundation page of the docs, cut at its `##` headings.
 *
 * A section, or the whole page when the note sits above the first heading, is
 * inherited when it carries the docs' note for it — `> Inherited from X, not
 * yet a pmndrs decision` (#25). The note is the one place that split is
 * written, so the cards read it rather than restate it.
 */
function readPage(dir) {
  const text = readFileSync(new URL(`../docs/${dir}/introduction.mdx`, import.meta.url), 'utf8')
  const [preamble, ...chunks] = text.split(/^## /m)
  const inheritedFrom = (chunk) => chunk.match(/^> Inherited from (.+?), not yet a pmndrs decision/m)?.[1]

  return {
    dir,
    title: text.match(/^title: (.+)$/m)[1],
    text,
    inherited: inheritedFrom(preamble),
    sections: chunks.map((chunk) => ({
      heading: chunk.slice(0, chunk.indexOf('\n')).trim(),
      body: chunk,
      inherited: inheritedFrom(chunk),
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
 * nothing: an empty table here is a card with nothing on it.
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
  ['colors', 'typography', 'spacing', 'radius', 'shadows', 'assets'].map((dir) => [dir, readPage(dir)])
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

const brandColors = pmndrsMtb.customColors.map(({ name }) => name)
const brandRoles = brandColors.flatMap((name) => [name, `on-${name}`, `${name}-container`, `on-${name}-container`])

/**
 * Tailwind's own defaults, from its first `@theme default` block, for the two
 * values no docs page lists: the mono fallback stack, and `--radius-xs`, the
 * one Tailwind radius step outside the base-nova scale.
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

/** The logo variants, from the Assets page, with the files the `logo` item ships. */
const logos = tableRows(section(pages.assets, 'Logo').body).map(([variant, preview, file, behavior]) => {
  const shipped = item('logo').files.find((entry) => entry.target === `~/${file}`)
  if (!shipped) throw new Error(`the logo item ships no ${file}`)
  return { variant, alt: preview.match(/alt="([^"]+)"/)[1], file, behavior, source: shipped.path }
})

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

/** `--radius` and the base-nova scale, from the Radius page. */
const radius = pages.radius.text.match(/^\s*--radius:\s*([^;]+);/m)[1]
const radii = tableRows(section(pages.radius, 'Scale').body).map(([token, utility, formula, value]) => ({
  token,
  utility,
  formula,
  value,
}))

/**
 * `radius`, then every Tailwind radius step in Tailwind's order: the
 * Radius page's value where it lists the step, Tailwind's default where it
 * does not (`radius-xs`).
 */
function radiusTokens() {
  const steps = Object.keys(tailwindDefaults).filter((name) => /^--radius-[\w]+$/.test(name))
  return [
    { name: 'radius', value: radius, usage: usage('radius', 'radius') },
    ...steps.map((token) => {
      const name = token.slice(2)
      const value = radii.find((entry) => entry.token === token)?.value ?? tailwindDefaults[token]
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
/* Cards                                                                      */
/* ------------------------------------------------------------------------ */

/*
 * A card is a preview the artifact renders in a frame on its own origin,
 * with `tokens.css` and the fonts already loaded: every colour, radius and
 * shadow in a card is a `var(--<token>)` of tokens.json, never a value.
 *
 * Each card is laid out in fixed pixels, so its height is known here and
 * written on its `@dsCard` line: the artifact gives a card row that height,
 * and a card taller than `maxHeight` fails the build. Monospace labels are
 * measured at `monoAdvance` of their size, a little wider than Inconsolata's
 * half an em, so a fallback font still fits.
 */
const maxHeight = 400
const pad = { x: 20, y: 16 }
const band = { height: 52, gap: 12 }
const monoAdvance = 0.6

/**
 * Every rule that sets a text colour names the surface under it too, so
 * `artifact.test.mjs` can check each pair's contrast in both themes.
 */
const baseCss = (width, height) => `html,body{margin:0}
*{box-sizing:border-box}
body{width:${width}px;height:${height}px;overflow:hidden;padding:${pad.y}px ${pad.x}px;background:var(--background);color:var(--foreground);font-family:var(--font-sans, sans-serif);font-size:12px;line-height:16px}
code{font-family:var(--font-mono, monospace)}
.band{height:${band.height}px;margin-bottom:${band.gap}px;padding:8px 12px;border-radius:var(--radius-lg);background:var(--muted);color:var(--foreground)}
.band h1{margin:0;font-size:15px;line-height:20px;font-weight:600;color:var(--foreground);background:var(--muted)}
.band p{margin:0;font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted-foreground);background:var(--muted)}
.label{font-size:10px;line-height:12px;color:var(--muted-foreground);background:var(--background)}`

/** The theme halves of a swatch: the frame's own theme never decides which is which. */
const swatch = (name) =>
  `<span class="chip"><i data-theme="light" style="background:var(--${name})"></i><i data-theme="dark" style="background:var(--${name})"></i></span>`

/**
 * A grid of light|dark swatches, a label under each, in `columns` columns.
 * Labels wrap; the rows are as tall as the longest label needs.
 */
function swatchGrid(entries, columns, contentWidth) {
  const gap = 8
  const chip = 24
  const columnWidth = (contentWidth - gap * (columns - 1)) / columns
  const perLine = Math.floor(columnWidth / (10 * monoAdvance))
  const lines = Math.max(...entries.map(({ label }) => Math.ceil(label.length / perLine)))
  const tile = chip + 4 + lines * 12
  const rows = Math.ceil(entries.length / columns)
  return {
    css: `.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap}px}
.chip{display:flex;height:${chip}px;border-radius:var(--radius-sm);overflow:hidden;outline:1px solid var(--border);outline-offset:-1px}
.chip i{flex:1}
.tile code{display:block;margin-top:4px;height:${lines * 12}px;overflow:hidden;overflow-wrap:anywhere;font-size:10px;line-height:12px;color:var(--foreground);background:var(--background)}`,
    html: `<div class="grid">
${entries.map(({ name, label }) => `<div class="tile">${swatch(name)}<code>${escape(label)}</code></div>`).join('\n')}
</div>`,
    height: rows * tile + (rows - 1) * gap,
  }
}

/** MD3 roles that are not brand roles, split into the accent families and the rest. */
const coreRoles = roles.filter((role) => !brandRoles.includes(role))
const isAccent = (role) => /primary|secondary|tertiary|error/.test(role)

const roleEntries = (list) => list.map((role) => ({ name: `md-sys-color-${role}`, label: role }))

const colorsPage = pages.colors

/**
 * Every card: its folder under `components/`, its group, the docs page it
 * mirrors, its band, its README lines, and a `body(contentWidth)` returning
 * `{ css, html, height }`.
 */
const cards = [
  {
    name: 'ShadcnTokens',
    group: 'Colors',
    page: colorsPage,
    title: 'shadcn tokens',
    subtitle: 'Use these first. Each swatch: light | dark.',
    summary: 'The shadcn colour tokens, light and dark: the first names to reach for.',
    rules: [
      'Reach for these before any MD3 role: `bg-primary`, `text-muted-foreground`, `border-input`.',
      'Each one aliases an MD3 role; tokens.json names it.',
    ],
    body: (width) => swatchGrid(remap.map(({ name }) => ({ name, label: name })), 7, width),
  },
  {
    name: 'Md3SurfaceRoles',
    group: 'Colors',
    page: colorsPage,
    title: 'MD3 roles: surfaces and outlines',
    subtitle: '`md-sys-color-*`, where shadcn has no name. Each swatch: light | dark.',
    summary: 'The Material Design 3 surface, outline and inverse roles, light and dark.',
    rules: [
      'Use one only where shadcn has no name for it: `md-sys-color-surface-dim`, the `surface-container-*` steps.',
      'Put `md-sys-color-on-<role>` on `md-sys-color-<role>`.',
    ],
    body: (width) => swatchGrid(roleEntries(coreRoles.filter((role) => !isAccent(role))), 8, width),
  },
  {
    name: 'Md3AccentRoles',
    group: 'Colors',
    page: colorsPage,
    title: 'MD3 roles: primary, secondary, tertiary, error',
    subtitle: '`md-sys-color-*`. The `fixed` roles keep one value in both schemes.',
    summary: 'The Material Design 3 accent roles, their containers and fixed variants, light and dark.',
    rules: [
      'The lime seed is `md-sys-color-primary-container`; `primary` is a dark olive in light and white in dark.',
      'Put `md-sys-color-on-<role>` on `md-sys-color-<role>`, `-on-<role>-container` on `-<role>-container`.',
    ],
    body: (width) => swatchGrid(roleEntries(coreRoles.filter(isAccent)), 8, width),
  },
  {
    name: 'BrandColours',
    group: 'Colors',
    page: colorsPage,
    title: 'Brand colours',
    subtitle: 'Four roles per custom colour, never in place of a token. Each swatch: light | dark.',
    summary: 'The seven pmndrs brand colours, each as its four MD3 roles, light and dark.',
    rules: [
      'For the brand hex as a fill, use `md-sys-color-<name>-container` with `md-sys-color-on-<name>-container` on it.',
      'An accent, never in place of a shadcn token.',
    ],
    body: (width) => {
      const head = 12
      const row = 24
      const gap = 6
      const columns = ['<name>', 'on-<name>', '<name>-container', 'on-<name>-container']
      return {
        css: `.brand{display:grid;grid-template-columns:72px repeat(4,1fr);gap:${gap}px 8px;align-items:center}
.brand .label{height:${head}px}
.brand code{font-size:11px;line-height:${row}px;color:var(--foreground);background:var(--background)}
.chip{display:flex;height:${row}px;border-radius:var(--radius-sm);overflow:hidden;outline:1px solid var(--border);outline-offset:-1px}
.chip i{flex:1}`,
        html: `<div class="brand">
<span></span>${columns.map((label) => `<code class="label">${escape(label)}</code>`).join('')}
${brandColors
  .map((name) => `<code>${name}</code>${[name, `on-${name}`, `${name}-container`, `on-${name}-container`].map((role) => swatch(`md-sys-color-${role}`)).join('')}`)
  .join('\n')}
</div>`,
        height: head + gap + brandColors.length * row + (brandColors.length - 1) * gap,
      }
    },
  },
  {
    name: 'TonalPalettes',
    group: 'Colors',
    page: colorsPage,
    title: 'Tonal palettes',
    subtitle: '`md-ref-palette-<name>-<tone>`: the same in light and dark. Build with a role instead.',
    summary: 'The tonal palettes every MD3 role aliases, one ramp per seed, the same in both schemes.',
    rules: [
      'Never build with an `md-ref-palette-*` shade directly: use the `md-sys-color-*` role that aliases it.',
    ],
    body: () => {
      const head = 12
      const row = 18
      const gap = 3
      const tones = [...ramps.values()][0]
      return {
        css: `.ramps{display:grid;grid-template-columns:104px repeat(${tones.length},1fr);gap:${gap}px 1px;align-items:center}
.ramps .label{height:${head}px;text-align:center;font-family:var(--font-mono, monospace);font-size:9px}
.ramps code{font-size:11px;line-height:${row}px;color:var(--foreground);background:var(--background)}
.ramps i{display:block;height:${row}px}`,
        html: `<div class="ramps">
<span></span>${tones.map((tone) => `<span class="label">${tone}</span>`).join('')}
${[...ramps]
  .map(([ramp, rampTones]) => `<code>${ramp}</code>${rampTones.map((tone) => `<i style="background:var(--md-ref-palette-${ramp}-${tone})"></i>`).join('')}`)
  .join('\n')}
</div>`,
        height: head + gap + ramps.size * row + (ramps.size - 1) * gap,
      }
    },
  },
  {
    name: 'FontFamilies',
    group: 'Type',
    page: pages.typography,
    title: 'Font families',
    subtitle: 'Never hardcode a family: text is sans, `code` `kbd` `samp` `pre` are mono on their own.',
    summary: 'Inter, the sans family, and Inconsolata, the mono family, with the inline code style.',
    rules: [
      'Never hardcode a font family. Headings inherit the sans family.',
      'Inline code follows shadcn\'s recipe: `font-mono text-sm font-semibold` on `bg-muted`.',
    ],
    body: () => {
      const specimen = 2 + 24 + 32 + 4 + 20 + 4 + 16
      const code = inlineCode().style
      const step = typeScale.find(({ fontSize }) => fontSize === code.fontSize)
      return {
        css: `.specimen{height:${specimen}px;margin-bottom:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-lg)}
.specimen .big{font-size:28px;line-height:32px;margin-bottom:4px}
.specimen .line{font-size:14px;line-height:20px;margin-bottom:4px}
.specimen .label{background:var(--background)}
.inline{height:28px;display:flex;align-items:center;gap:8px}
.inline code{padding:0.2rem 0.3rem;border-radius:var(--radius-sm);font-size:${code.fontSize};line-height:${step.pixels.lineHeight}px;font-weight:${code.fontWeight};color:var(--foreground);background:var(--muted)}`,
        html: `${fonts
          .map(
            ({ role, family, utility, variable, key }) => `<div class="specimen" style="font-family:var(--font-${key})">
<div class="big">${escape(family)} Aa Bb Cc 0123</div>
<div class="line">The quick brown fox jumps over the lazy dog.</div>
<div class="label">${escape(role)}: <code>${utility}</code>, <code>${variable}</code></div>
</div>`
          )
          .join('\n')}
<div class="inline"><span class="label">Inline code</span><code>npx shadcn@latest add</code></div>`,
        height: fonts.length * (specimen + 12) + 28,
      }
    },
  },
  {
    name: 'TypeScale',
    group: 'Type',
    page: pages.typography,
    title: 'Type scale',
    subtitle: `${section(pages.typography, 'Type scale').inherited ? `Inherited from ${section(pages.typography, 'Type scale').inherited}, not a pmndrs decision. ` : ''}Size / line height, px.`,
    summary: 'The `text-xs` to `text-9xl` scale, each step at its own size.',
    rules: [
      'Set UI text in `text-sm` and body copy in `text-base`.',
      'Inherited from Tailwind: never cite it as a pmndrs rule.',
    ],
    body: () => {
      const split = typeScale.findIndex(({ lineHeight }) => typeof lineHeight === 'number')
      const rows = [typeScale.slice(0, split), typeScale.slice(split)]
      const labels = 4 + 24
      const rowHeight = (steps) => Math.max(...steps.map(({ pixels }) => pixels.lineHeight)) + labels
      return {
        css: `.scale{display:flex;align-items:flex-end;gap:16px;margin-bottom:16px}
.scale .sample{white-space:nowrap}
.scale .label{display:block;margin-top:4px;height:24px}`,
        html: rows
          .map(
            (steps) => `<div class="scale">
${steps
  .map(
    ({ name, fontSize, lineHeight, pixels }) =>
      `<div><div class="sample" style="font-size:${fontSize};line-height:${lineHeight}">Aa</div><code class="label">${name}<br />${pixels.fontSize}/${pixels.lineHeight}</code></div>`
  )
  .join('\n')}
</div>`
          )
          .join('\n'),
        height: rows.reduce((sum, steps) => sum + rowHeight(steps), 0) + 16 * (rows.length - 1),
      }
    },
  },
  {
    name: 'SpacingScale',
    group: 'Spacing',
    page: pages.spacing,
    title: 'Spacing',
    subtitle: `${pages.spacing.inherited ? `Inherited from ${pages.spacing.inherited}, not a pmndrs decision. ` : ''}Step n is n × --spacing.`,
    summary: 'The spacing scale: every padding, margin, gap and size utility as a multiple of `--spacing`.',
    rules: [
      `Space with multiples of \`spacing\` (${spacingBase}): never an arbitrary pixel value.`,
      'Inherited from Tailwind: never cite it as a pmndrs rule.',
    ],
    width: 800,
    body: () => {
      const row = 12
      const gap = 4
      /** Three columns, by bar length: up to 1rem, up to 4rem, the rest. */
      const length = ({ value }) => (value === '1px' ? 1 / 16 : parseFloat(value) || 0)
      const columns = [
        spacingScale.filter((entry) => length(entry) <= 1),
        spacingScale.filter((entry) => length(entry) > 1 && length(entry) <= 4),
        spacingScale.filter((entry) => length(entry) > 4),
      ]
      const bar = ({ step }) => (step === 'px' ? '1px' : `calc(var(--spacing) * ${step})`)
      return {
        css: `.base{height:16px;margin-bottom:8px}
.steps{display:flex;gap:16px;align-items:flex-start}
.steps .col{display:grid;grid-template-columns:28px 40px auto;gap:${gap}px 8px;align-items:center}
.steps code{font-size:10px;line-height:${row}px;color:var(--foreground);background:var(--background)}
.steps .label{font-family:var(--font-mono, monospace)}
.steps i{display:block;height:${row}px;background:var(--primary)}`,
        html: `<div class="base"><code>--spacing: ${escape(spacingBase)}</code></div>
<div class="steps">
${columns
  .map(
    (entries) => `<div class="col">
${entries.map((entry) => `<code>${escape(entry.step)}</code><span class="label">${escape(entry.value)}</span><i style="width:${bar(entry)}"></i>`).join('\n')}
</div>`
  )
  .join('\n')}
</div>`,
        height: 16 + 8 + Math.max(...columns.map((entries) => entries.length * row + (entries.length - 1) * gap)),
      }
    },
  },
  {
    name: 'RadiusScale',
    group: 'Radius',
    page: pages.radius,
    title: 'Radius',
    subtitle: `A pmndrs decision: --radius: ${radius}, and the base-nova scale multiplying it.`,
    summary: 'The base radius and the base-nova scale derived from it.',
    rules: [
      `Every corner derives from \`radius\` (${radius}): round with \`rounded-sm\` to \`rounded-4xl\`.`,
      'Change `radius` and every corner rescales.',
    ],
    body: () => {
      const size = 72
      const labels = 6 + 36
      return {
        css: `.base{height:16px;margin-bottom:12px}
.radii{display:flex;gap:16px}
.radii .shape{width:${size}px;height:${size}px;background:var(--md-sys-color-primary-container);outline:2px solid var(--primary);outline-offset:-2px}
.radii .label{display:block;margin-top:6px;height:36px}`,
        html: `<div class="base"><code>--radius: ${escape(radius)}</code></div>
<div class="radii">
${radii
  .map(
    ({ token, utility, formula, value }) =>
      `<div><div class="shape" style="border-radius:var(${token})"></div><code class="label">${utility}<br />${escape(value)}<br />${escape(formula.replace('var(--radius)', 'radius').replace(/^calc\((.*)\)$/, '$1'))}</code></div>`
  )
  .join('\n')}
</div>`,
        height: 16 + 12 + size + labels,
      }
    },
  },
  {
    name: 'Shadows',
    group: 'Shadows',
    page: pages.shadows,
    title: 'Shadows',
    subtitle: `${pages.shadows.inherited ? `Inherited from ${pages.shadows.inherited}, not a pmndrs decision. ` : ''}Black at low opacity in both schemes.`,
    summary: 'The box, inset and drop shadows: elevation, recess, and shadows for shapes that are not boxes.',
    rules: [
      'Elevate with `shadow-*`, recess with `inset-shadow-*`, shadow icons and SVGs with `drop-shadow-*`.',
      'In dark, set surfaces apart with the `md-sys-color-surface-container-*` steps instead.',
    ],
    body: () => {
      const label = 16
      const stage = 10 + 40 + 10
      const gap = 10
      const family = (heading, render) => `<div class="family"><span class="label">${escape(heading)}</span><div class="stage">
${shadowRows(heading).map(render).join('\n')}
</div></div>`
      const box = ({ name }) => `<div class="box" style="box-shadow:var(--${name})"><code>${name}</code></div>`
      const star = ({ name }) =>
        `<div class="drop"><svg viewBox="0 0 24 24" aria-hidden="true" style="filter:drop-shadow(var(--${name}))"><polygon points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9" /></svg><code>${name}</code></div>`
      return {
        css: `.family{margin-bottom:${gap}px}
.family .label{display:block;height:${label}px}
.stage{display:flex;gap:10px;height:${stage}px;padding:10px;border-radius:var(--radius-lg);background:var(--md-sys-color-surface-container-low)}
.box{flex:1;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md);background:var(--md-sys-color-surface-container-lowest);color:var(--foreground)}
.box code,.drop code{font-size:10px;line-height:12px}
.drop{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.drop svg{width:22px;height:22px;fill:var(--md-sys-color-primary-container)}
.drop code{color:var(--foreground);background:var(--md-sys-color-surface-container-low)}`,
        html: [family('Box shadow', box), family('Inset shadow', box), family('Drop shadow', star)].join('\n'),
        height: 3 * (label + stage) + 2 * gap,
      }
    },
  },
  {
    name: 'Logo',
    group: 'Brand',
    page: pages.assets,
    title: 'Logo',
    subtitle: 'Always on its own black square: never recoloured, cropped or redrawn.',
    summary: 'The four states of the pmndrs logo, each painting its own black square.',
    rules: [
      'Use `logo_complete.svg` from the Logos group as the mark, as an image.',
      'Never recolour, crop or redraw it; there is no transparent variant.',
    ],
    body: () => {
      const size = 112
      const labels = 6 + 16 + 4 + 48
      return {
        css: `.logos{display:grid;grid-template-columns:repeat(${logos.length},1fr);gap:16px}
.logos img{display:block}
.logos strong{display:block;margin-top:6px;font-size:12px;line-height:16px;font-weight:600}
.logos .label{display:block;margin-top:4px;height:48px;overflow:hidden}`,
        html: `<div class="logos">
${logos
  .map(({ variant, alt, behavior, source }) => {
    const svg = readFileSync(new URL(`../${source}`, import.meta.url)).toString('base64')
    return `<div><img src="data:image/svg+xml;base64,${svg}" width="${size}" height="${size}" alt="${escape(alt)}" /><strong>${escape(variant)}</strong><span class="label">${escape(behavior)}</span></div>`
  })
  .join('\n')}
</div>`,
        height: size + labels,
      }
    },
  },
]

const defaultWidth = 760

/** A card's `preview.html`, its `@dsCard` line first, and its height. */
function preview(card) {
  const width = card.width ?? defaultWidth
  const body = card.body(width - 2 * pad.x)
  const height = Math.ceil(2 * pad.y + band.height + band.gap + body.height)
  if (height > maxHeight) throw new Error(`the ${card.name} card is ${height}px tall, over ${maxHeight}px`)
  const html = `<!-- @dsCard group="${card.group}" height=${height} width=${width} -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${baseCss(width, height)}
${body.css}
</style>
</head>
<body>
<header class="band"><h1>${escape(card.title)}</h1><p>${escape(card.subtitle).replace(/`([^`]+)`/g, '<code>$1</code>')}</p></header>
${body.html}
</body>
</html>
`
  return { html, height }
}

/** A card's `README.md`: what it shows, the rules it illustrates, the docs page behind it. */
const cardReadme = (card) => `${card.summary}

${card.rules.map((rule) => `- ${rule}`).join('\n')}

Mirrors the ${card.page.title} page of the docs: ${notes.meta.docsSite.main}${card.page.dir}/introduction.
`

/* ------------------------------------------------------------------------ */
/* Outputs                                                                    */
/* ------------------------------------------------------------------------ */

/** Every file of `dir`, relative to it, sorted. */
const walk = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((name) => statSync(new URL(name, dir)).isFile())
    .sort()

const previews = cards.map((card) => ({ card, ...preview(card) }))

/** The height of each card, by name: the `@dsCard` line carries it too. */
export const cardHeights = Object.fromEntries(previews.map(({ card, height }) => [card.name, height]))

/**
 * Every file the script writes, as `[path, content]`, `path` relative to the
 * output folder's `project/`. Exported rather than written on import, as
 * `build.mjs` does, so `artifact.test.mjs` can write them where it checks
 * them.
 */
export const outputs = [
  ['tokens.json', `${JSON.stringify(tokens(), null, 2)}\n`],
  ...walk(sourceDir).map((path) => [path, fill(readFileSync(new URL(path, sourceDir), 'utf8'), `artifact/${path}`)]),
  ...fontFiles.map(({ file, source }) => [file, readFileSync(source)]),
  ...previews.flatMap(({ card, html }) => [
    [`components/${card.name}/preview.html`, html],
    [`components/${card.name}/README.md`, cardReadme(card)],
  ]),
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
