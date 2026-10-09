/**
 * Generates the inputs of the Claude Design sync, into
 * `.design-sync/.cache/design/` (gitignored). The sync runs in four steps:
 *
 *   1. `npm run design-bundle`  this script
 *   2. the `/design-sync` converter, which reads these files through
 *      `.design-sync/config.json` and builds `ds-bundle/`
 *   3. `npm run design-place`  this script again, with `--place ds-bundle`:
 *      the converter files HTML cards only under `components/`, which a
 *      tokens-only design system leaves empty, so the cards are copied into
 *      `ds-bundle/guidelines/cards/` after its build
 *   4. `/design-sync`, which uploads `ds-bundle/` to the claude.ai/design
 *      project
 *
 * What it writes:
 *
 *   styles.css          the converter's `cssEntry`: the pmndrs theme, compiled
 *                       for exactly the classes guidelines.md lists
 *   guidelines.md       the converter's `readmeHeader`: the rules, as
 *                       instructions, at the head of the README a design
 *                       agent reads first
 *   cards/<name>.html   one preview card per foundation page of the docs and
 *                       per logo variant, light and dark side by side, each
 *                       starting with the `<!-- @dsCard group="…" -->` line
 *                       Claude Design files it by
 *
 * Nothing is typed twice. Every value comes from where it is decided:
 *
 *   registry.json                    the baked palette and the logo files
 *   registry/md3-base/md3.ts         the names of the brand colours
 *   material-theme-builder           the shadcn remap and the MD3 utilities
 *   tailwindcss                      the utilities, and every inherited value
 *   docs/<page>/introduction.mdx     the radius, the font families, the spacing
 *                                    steps, the logo variants — the tables the
 *                                    docs call their source of truth — and
 *                                    which sections are inherited
 *   preset.json                      the icon library
 *
 * So the cards and the stylesheet carry the CSS a pmndrs app gets, compiled by
 * Tailwind v4 from the same `@plugin`, remap and palette `theme` installs, plus
 * what `shadcn init --preset` writes on top: the `@theme inline` colour names
 * and the base-nova radius scale.
 *
 * Regenerated whole on every run and never committed. Nothing in it names a
 * version, so a build from a release tag is that release's design system.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from 'tailwindcss'
import preset from '../preset.json' with { type: 'json' }
import registry from '../registry.json' with { type: 'json' }
import { pmndrsMtb } from '../registry/md3-base/md3.ts'

const root = new URL('../', import.meta.url)
/** Where `npm run design-bundle` writes, and `.design-sync/config.json` reads. */
export const designDir = new URL('../.design-sync/.cache/design/', import.meta.url)

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
 * written, so the cards and the guidelines read it rather than restate it.
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
        .map((cell) => cell.trim().replace(/^`(.*)`$/, '$1'))
    )
  if (start === -1 || !rows.length) throw new Error(`no table in:\n${markdown.slice(0, 200)}`)
  return rows
}

const pages = Object.fromEntries(
  ['colors', 'typography', 'spacing', 'radius', 'shadows', 'assets'].map((dir) => [dir, readPage(dir)])
)

/** The baked palette, as `theme` installs it: `:root` and the `.dark` overrides. */
const palette = item('theme').css

/**
 * The shadcn remap: every shadcn variable and the MD3 role it points at, read
 * from the stylesheet `md3-base` imports.
 */
const remapCss = readFileSync(resolvePath('material-theme-builder/shadcn.css'), 'utf8')
const remap = [...remapCss.matchAll(/^\s*--([\w-]+):\s*var\(--md-sys-color-([\w-]+)\);/gm)].map(([, name, role]) => ({
  name,
  role,
}))

/** Every MD3 role the palette defines, `surface-dim`, `on-lime`, … */
const roles = Object.keys(palette[':root'])
  .filter((name) => name.startsWith('--md-sys-color-'))
  .map((name) => name.slice('--md-sys-color-'.length))

/**
 * The tonal palettes, each with its tones, highest first. A palette name can
 * hold a dash (`neutral-variant`), so the tone is the last segment only.
 */
const ramps = new Map()
for (const name of Object.keys(palette[':root'])) {
  const match = name.match(/^--md-ref-palette-(.+)-(\d+)$/)
  if (!match) continue
  const [, ramp, tone] = match
  if (!ramps.has(ramp)) ramps.set(ramp, [])
  ramps.get(ramp).push(Number(tone))
}
for (const tones of ramps.values()) tones.sort((a, b) => b - a)

const brandColors = pmndrsMtb.customColors.map(({ name }) => name)

/**
 * Tailwind's own defaults, from its first `@theme default` block — the
 * second is its deprecated aliases. These are the inherited values: the type
 * scale, `--spacing`, the shadows and the fallback font stacks.
 */
const tailwindThemeCss = readFileSync(resolvePath('tailwindcss/theme.css'), 'utf8')
const tailwindDefaults = Object.fromEntries(
  [...tailwindThemeCss.slice(0, tailwindThemeCss.indexOf('\n}\n')).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(
    ([, name, value]) => [name, value.replace(/\s+/g, ' ').trim()]
  )
)
const tailwindScale = (prefix) =>
  Object.entries(tailwindDefaults)
    .filter(([name]) => name.startsWith(`--${prefix}-`) && !name.slice(prefix.length + 3).includes('-'))
    .map(([name, value]) => ({ step: name.slice(prefix.length + 3), value }))

/** `--radius` and the base-nova scale, from the Radius page. */
const radius = pages.radius.text.match(/^\s*--radius:\s*([^;]+);/m)[1]
const radii = tableRows(section(pages.radius, 'Scale').body).map(([token, utility, value]) => ({ token, utility, value }))

/** The two families, from the Typography page: `Inter` on `--font-sans`, … */
const fonts = tableRows(section(pages.typography, 'Font family').body).map(([role, family, utility, variable]) => ({
  role,
  family,
  utility,
  variable,
}))

/** The common spacing steps, from the Spacing page. */
const spacing = tableRows(section(pages.spacing, 'Scale').body).map(([step, value]) => ({ step, value }))

/** The logo variants, from the Assets page, with the files the `logo` item ships. */
const logos = tableRows(section(pages.assets, 'Logo').body).map(([variant, preview, file, behavior]) => {
  const shipped = item('logo').files.find((entry) => entry.target === `~/${file}`)
  if (!shipped) throw new Error(`the logo item ships no ${file}`)
  return { variant, alt: preview.match(/alt="([^"]+)"/)[1], file, behavior, source: shipped.path }
})

/* ------------------------------------------------------------------------ */
/* Cards                                                                      */
/* ------------------------------------------------------------------------ */

const inheritedNote = (from) =>
  `<p class="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground" data-inherited>Inherited from ${escape(from)}, not yet a pmndrs decision.</p>`

const heading = (text) => `<h2 class="text-sm font-semibold tracking-tight">${escape(text)}</h2>`

/** A colour chip with its name under it. */
const swatch = (utility, label, detail = '') =>
  `<div class="flex min-w-0 flex-col gap-1"><div class="h-10 rounded-md border ${utility}"></div><code class="truncate text-xs">${escape(label)}</code>${
    detail ? `<span class="truncate text-xs text-muted-foreground">${escape(detail)}</span>` : ''
  }</div>`

const shadcnNames = new Set(remap.map(({ name }) => name))

/**
 * An MD3 role's utility. Three role names collide with shadcn's
 * (`background`, `primary`, `secondary`) and shadcn's win, so those reach
 * the role through its variable — the swatch must show the role itself.
 */
const roleUtility = (role) => (shadcnNames.has(role) ? `bg-(--md-sys-color-${role})` : `bg-${role}`)

/**
 * The tonal palettes have no scheme, so only the light side draws them: 364
 * swatches twice would be most of the card for nothing.
 */
function colorsBody(scheme) {
  const brandRoles = new Set(brandColors.flatMap((name) => [name, `on-${name}`, `${name}-container`, `on-${name}-container`]))
  const coreRoles = roles.filter((role) => !brandRoles.has(role))
  const unnamed = new Set(coreRoles.filter((role) => !remap.some((entry) => entry.role === role)))
  const note = (role) => (shadcnNames.has(role) ? 'name taken by shadcn' : unnamed.has(role) ? 'no shadcn name' : '')
  const tones = [...ramps.values()][0]

  return `
<section class="flex flex-col gap-3">
  ${heading('shadcn tokens: use these first')}
  <p class="text-sm text-muted-foreground">Each one points at an MD3 role, named under it.</p>
  <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
    ${remap.map(({ name, role }) => swatch(`bg-${name}`, name, role)).join('\n    ')}
  </div>
</section>
<section class="flex flex-col gap-3">
  ${heading('MD3 roles: only where shadcn has no name')}
  <p class="text-sm text-muted-foreground">Those marked "no shadcn name" are the ones to reach for.</p>
  <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
    ${coreRoles
      .map((role) => swatch(roleUtility(role), role, note(role)))
      .join('\n    ')}
  </div>
</section>
<section class="flex flex-col gap-3">
  ${heading('Brand colours')}
  <div class="flex flex-col gap-2">
    ${brandColors
      .map(
        (name) =>
          `<div class="grid grid-cols-4 gap-2">${[name, `on-${name}`, `${name}-container`, `on-${name}-container`]
            .map((role) => swatch(roleUtility(role), role))
            .join('')}</div>`
      )
      .join('\n    ')}
  </div>
</section>
<section class="flex flex-col gap-3">
  ${heading('Tonal palettes')}
  <p class="text-sm text-muted-foreground">The same in light and dark: prefer a role, which follows the scheme.</p>
  ${scheme === 'dark' ? '' : `
  <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
    <span></span>
    <div class="grid grid-flow-col auto-cols-fr gap-px font-mono text-[9px] leading-none text-muted-foreground">${tones
      .map((tone) => `<span class="text-center">${tone}</span>`)
      .join('')}</div>
    ${[...ramps]
      .map(
        ([ramp, rampTones]) =>
          `<code class="text-xs">${ramp}</code><div class="grid grid-flow-col auto-cols-fr gap-px">${rampTones
            .map((tone) => `<div class="h-6 bg-(--md-ref-palette-${ramp}-${tone})" title="${ramp}-${tone}"></div>`)
            .join('')}</div>`
      )
      .join('\n    ')}
  </div>`}
</section>`
}

function typeBody() {
  const scale = section(pages.typography, 'Type scale')
  const steps = tailwindScale('text')

  return `
<section class="flex flex-col gap-3">
  ${heading('Font family')}
  ${fonts
    .map(
      ({ role, family, utility, variable }) => `<div class="flex flex-col gap-1 rounded-lg border p-4">
    <p class="${utility} text-4xl">Aa Bb Cc 0123</p>
    <p class="${utility} text-base">The quick brown fox jumps over the lazy dog.</p>
    <p class="text-xs text-muted-foreground">${escape(role)}: ${escape(family)}, <code>${utility}</code>, <code>${variable}</code></p>
  </div>`
    )
    .join('\n  ')}
</section>
<section class="flex flex-col gap-3">
  ${heading(scale.heading)}
  ${scale.inherited ? inheritedNote(scale.inherited) : ''}
  <div class="flex flex-col gap-2">
    ${steps
      .map(
        ({ step, value }) =>
          `<div class="flex items-baseline gap-4 overflow-hidden"><code class="w-20 shrink-0 text-xs">text-${step}</code><span class="w-40 shrink-0 text-xs text-muted-foreground">${escape(value)} / ${escape(tailwindDefaults[`--text-${step}--line-height`])}</span><span class="text-${step} whitespace-nowrap">Aa</span></div>`
      )
      .join('\n    ')}
  </div>
</section>`
}

function spacingBody() {
  return `
${pages.spacing.inherited ? inheritedNote(pages.spacing.inherited) : ''}
<p class="text-sm">A utility <code>n</code> is <code>n</code> times <code>--spacing: ${escape(tailwindDefaults['--spacing'])}</code>: <code>p-4</code>, <code>gap-2</code>, <code>size-10</code>…</p>
<div class="flex flex-col gap-1.5">
  ${spacing
    .map(
      ({ step, value }) =>
        `<div class="flex items-center gap-3"><code class="w-10 shrink-0 text-xs">${escape(step)}</code><span class="w-20 shrink-0 text-xs text-muted-foreground">${escape(value)}</span><div class="h-3 max-w-full w-${step} bg-primary"></div></div>`
    )
    .join('\n  ')}
</div>`
}

function radiusBody() {
  return `
<p class="text-sm">Every corner derives from <code>--radius: ${escape(radius)}</code>.</p>
<div class="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-4">
  ${radii
    .map(
      ({ utility, value }) =>
        `<div class="flex flex-col items-center gap-1"><div class="size-20 ${utility} border-2 border-primary bg-primary-container"></div><code class="text-xs">${utility}</code><span class="text-center text-xs text-muted-foreground">${escape(value)}</span></div>`
    )
    .join('\n  ')}
</div>`
}

function shadowsBody() {
  const family = (prefix, render) => `
<section class="flex flex-col gap-3">
  ${heading(`${prefix}-*`)}
  <div class="grid grid-cols-2 gap-6 rounded-lg bg-surface-container-low p-6 sm:grid-cols-3">
    ${tailwindScale(prefix)
      .map(({ step, value }) => render(`${prefix}-${step}`, value))
      .join('\n    ')}
  </div>
</section>`
  const box = (utility, value) =>
    `<div class="flex h-20 flex-col items-center justify-center gap-1 rounded-lg bg-surface-container-lowest p-2 ${utility}" title="${escape(value)}"><code class="text-xs">${utility}</code></div>`
  const shape = (utility, value) =>
    `<div class="flex flex-col items-center gap-2" title="${escape(value)}"><svg viewBox="0 0 24 24" class="size-12 fill-primary-container ${utility}" aria-hidden="true"><polygon points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9" /></svg><code class="text-xs">${utility}</code></div>`

  return `
${pages.shadows.inherited ? inheritedNote(pages.shadows.inherited) : ''}
${family('shadow', box)}
${family('inset-shadow', box)}
${family('drop-shadow', shape)}`
}

/**
 * The SVG the `logo` item ships, as a data URI: the card stays one file a
 * browser opens anywhere, and the image is the file itself, black square and
 * all, never a copy of its shapes.
 */
const logoBody = ({ alt, file, behavior, source }) => {
  const svg = readFileSync(new URL(`../${source}`, import.meta.url))
  return `
<div class="flex flex-wrap items-center gap-6">
  <img src="data:image/svg+xml;base64,${svg.toString('base64')}" width="160" height="160" alt="${escape(alt)}" />
  <img src="data:image/svg+xml;base64,${svg.toString('base64')}" width="48" height="48" alt="" />
</div>
<p class="text-sm">${escape(behavior)}</p>
<p class="text-xs text-muted-foreground">Installed as <code>${escape(file)}</code>. Always on its own black square.</p>`
}

/**
 * Every card: the group it is filed under, the docs page it mirrors, and
 * its body. A body renders twice, once per scheme, so the dark side is the
 * same markup under `.dark` rather than a second description of it.
 */
const cards = [
  { file: 'colors.html', group: 'Colors', page: pages.colors, body: colorsBody },
  { file: 'type.html', group: 'Type', page: pages.typography, body: typeBody },
  { file: 'spacing.html', group: 'Spacing', page: pages.spacing, body: spacingBody },
  { file: 'radius.html', group: 'Radius', page: pages.radius, body: radiusBody },
  { file: 'shadows.html', group: 'Shadows', page: pages.shadows, body: shadowsBody },
  ...logos.map((logo) => ({
    file: `logo-${logo.variant.toLowerCase()}.html`,
    group: 'Brand',
    page: pages.assets,
    title: `Logo, ${logo.variant.toLowerCase()}`,
    body: () => logoBody(logo),
  })),
]

const markup = cards.map((card) => {
  const panel = (scheme) => `<section class="${scheme === 'dark' ? 'dark ' : ''}flex min-w-0 flex-col gap-6 bg-background p-6 text-foreground" data-scheme="${scheme}">
  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">${scheme}</p>
  ${card.body(scheme).trim()}
</section>`

  return {
    ...card,
    title: card.title ?? card.page.title,
    main: `<main class="grid min-h-screen lg:grid-cols-2">
${panel('light')}
${panel('dark')}
</main>`,
  }
})

/* ------------------------------------------------------------------------ */
/* Stylesheet                                                                 */
/* ------------------------------------------------------------------------ */

const block = (selector, declarations) =>
  `${selector} {\n${Object.entries(declarations)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')}\n}`

/**
 * The stylesheet a pmndrs app ends up with:
 *
 * - `md3-base`'s own lines, the `@plugin` given the body the `theme` docs
 *   tell a consumer to add, so the brand colours have utilities;
 * - what `shadcn init --preset` writes: the `@theme inline` colour names,
 *   `--radius` and its base-nova scale, and the two families on
 *   `--font-sans` / `--font-mono` in front of Tailwind's fallback stacks;
 * - the baked palette, as `theme` installs it.
 */
const fontStacks = Object.fromEntries(
  fonts.map(({ family, variable }) => [variable, `'${family}', ${tailwindDefaults[variable]}`])
)
const entryCss = [
  `@import 'tailwindcss';`,
  ...Object.keys(item('md3-base').css).map((rule) =>
    rule.startsWith('@plugin') ? `${rule} {\n  custom-colors: ${brandColors.join(', ')};\n}` : `${rule};`
  ),
  block('@theme', fontStacks),
  block('@theme inline', {
    ...Object.fromEntries(remap.map(({ name }) => [`--color-${name}`, `var(--${name})`])),
    ...Object.fromEntries(radii.map(({ token, value }) => [token, value])),
  }),
  block(':root', { '--radius': radius }),
  ...Object.entries(palette).map(([selector, declarations]) => block(selector, declarations)),
].join('\n\n')

/**
 * `css` compiled by Tailwind for exactly `candidates`, the classes a page or
 * a design may use. A fresh compiler per call, because a Tailwind compiler
 * keeps every candidate it was ever handed: a shared one would give every
 * card the Colors card's 364 tonal-palette utilities, and the bundle would
 * weigh twice what it does.
 */
async function compileCss(css, candidates) {
  const compiler = await compile(css, {
    base: fileURLToPath(root),
    loadStylesheet: async (id) => {
      const path = resolvePath(id === 'tailwindcss' ? 'tailwindcss/index.css' : id)
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
    },
    loadModule: async (id) => {
      const path = resolvePath(id)
      return { path, base: dirname(path), module: (await import(path)).default }
    },
  })
  return compiler.build([...new Set(candidates)].filter(Boolean)).trim()
}

/** The one stylesheet above, compiled for the utilities `html` uses. */
const stylesheet = (html) =>
  compileCss(
    entryCss,
    [...html.matchAll(/class="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/))
  )

/**
 * Google Fonts, for the families the Typography page names: the one thing a
 * card fetches. Offline, the text falls back to Tailwind's stacks.
 */
const fontsHref = `https://fonts.googleapis.com/css2?${fonts
  .map(({ family }) => `family=${family.replaceAll(' ', '+')}:wght@400..700`)
  .join('&')}&display=swap`

async function page({ group, title, main }) {
  const body = `<body class="bg-background text-foreground">
<header class="border-b px-6 py-4">
<h1 class="text-xl font-semibold tracking-tight">${escape(title)}</h1>
<p class="text-sm text-muted-foreground">pmndrs design system · ${escape(group)}</p>
</header>
${main}
</body>`

  return `<!-- @dsCard group="${group}" -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>pmndrs: ${escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${escape(fontsHref)}" />
<style>
${await stylesheet(body)}
</style>
</head>
${body}
</html>
`
}

/* ------------------------------------------------------------------------ */
/* Design stylesheet                                                          */
/* ------------------------------------------------------------------------ */

/**
 * The colours a design may name: the shadcn tokens, the MD3 roles shadcn has
 * no name for, and the brand roles. A role whose name shadcn also uses
 * (`secondary`) has no utility of its own: `bg-secondary` is shadcn's, so it
 * is not offered as an MD3 one. Nor are the fixed roles (`on-primary-fixed`):
 * they keep one tone in light and dark, where a design follows the scheme.
 */
const shadcnColors = remap.map(({ name }) => name)
const brandRoles = brandColors.flatMap((name) => [name, `on-${name}`, `${name}-container`, `on-${name}-container`])
const md3Colors = roles.filter(
  (role) =>
    !remap.some((entry) => entry.role === role) &&
    !brandRoles.includes(role) &&
    !shadcnNames.has(role) &&
    !role.includes('-fixed')
)
/** `text-shadow` is Tailwind's text-shadow utility, so these two get `bg-` alone: they are backdrops anyway. */
const backdropOnly = ['scrim', 'shadow']

/**
 * The shadcn tokens a tint or a hover takes: the one-word ones, the sidebar's
 * own set aside. Each tint is a `color-mix()` rule, and tinting every token
 * would double the stylesheet for classes shadcn's own components never use.
 */
const tintable = shadcnColors.filter((name) => !name.includes('-') && name !== 'sidebar')

/**
 * A class pattern, written once for both readers: `text` for the guidelines,
 * in the shell's brace notation, and `classes`, its expansion, for the
 * compiler. A part is a literal string, an array of alternatives
 * (`{sm,md}`), or a `range` / `named` set shown short.
 */
const range = (values) => ({ shown: `{${values[0]}…${values.at(-1)}}`, values })
const named = (shown, values) => ({ shown, values })
const pattern = (...parts) => {
  const values = (part) => (typeof part === 'string' ? [part] : Array.isArray(part) ? part : part.values)
  const shown = (part) =>
    typeof part === 'string' ? part : Array.isArray(part) ? (part.length === 1 ? part[0] : `{${part.join(',')}}`) : part.shown
  return {
    text: parts.map(shown).join(''),
    classes: parts.reduce((prefixes, part) => prefixes.flatMap((prefix) => values(part).map((value) => `${prefix}${value}`)), ['']),
  }
}

/** The colours a class may name; `scrim` and `shadow` are `bg-` only, below. */
const colours = [...shadcnColors, ...md3Colors, ...brandRoles].filter((color) => !backdropOnly.includes(color))
const spacingSteps = spacing.map(({ step }) => step)
const steps = (prefix) => tailwindScale(prefix).map(({ step }) => step)

/**
 * The shadcn typography recipe, as the Typography page writes it: every class
 * of its `tsx` snippets, so a heading or a quote styled by the recipe renders.
 */
const recipe = [...section(pages.typography, 'Elements').body.matchAll(/```tsx\n([\s\S]*?)```/g)].flatMap(([, snippet]) =>
  [...snippet.matchAll(/className="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/))
)

/**
 * The classes a design may use, by family: the one list the design
 * stylesheet is compiled for and the guidelines' table is written from. So a
 * class the guidelines name always renders, and one they do not name does
 * not exist, the stock palette (`bg-zinc-800`) included.
 */
const vocabulary = [
  {
    family: 'Colour',
    patterns: [
      pattern(['bg', 'text', 'border'], '-', named('<colour>', colours)),
      pattern('bg-', backdropOnly),
      pattern(['ring', 'fill', 'stroke'], '-', named('<token>', tintable)),
    ],
  },
  { family: 'Tint', patterns: [pattern('bg-', named('<token>', tintable), '/', ['10', '20', '50', '80', '90'])] },
  {
    family: 'Text',
    patterns: [
      pattern('text-', range(steps('text'))),
      pattern('font-', range(steps('font-weight'))),
      pattern('leading-', range(['none', ...steps('leading')])),
      pattern('tracking-', range(steps('tracking'))),
      pattern(['text-center', 'uppercase', 'truncate', 'tabular-nums']),
    ],
  },
  { family: 'Font', patterns: [pattern('font-', fonts.map(({ utility }) => utility.slice('font-'.length)))] },
  {
    family: 'Radius',
    patterns: [pattern('rounded-', range(radii.map(({ utility }) => utility.slice('rounded-'.length)))), pattern('rounded-', ['none', 'full'])],
  },
  {
    family: 'Border',
    patterns: [
      pattern('border'),
      pattern('border-', ['2', 't', 'b', 'dashed']),
      pattern('ring', ['', '-2']),
      pattern('outline-none'),
    ],
  },
  {
    family: 'Elevation',
    patterns: [
      ...['shadow', 'drop-shadow'].map((prefix) => pattern(`${prefix}-`, range(steps(prefix)))),
      pattern('shadow-none'),
    ],
  },
  {
    family: 'Space',
    patterns: [
      pattern(['p', 'm'], ['', 'x', 'y', 't', 'r', 'b', 'l'], '-', range(spacingSteps.slice(0, spacingSteps.indexOf('16') + 1))),
      pattern('gap', ['', '-x', '-y'], '-', range(spacingSteps.slice(0, spacingSteps.indexOf('16') + 1))),
      pattern(['mx', 'ml', 'mt'], '-auto'),
    ],
  },
  {
    family: 'Size',
    patterns: [
      pattern(['w', 'h', 'size'], '-', range(spacingSteps)),
      pattern(['w', 'h', 'size'], '-', ['full', 'auto']),
      pattern('min-h-screen'),
      pattern('min-w-0'),
      
      pattern('max-w-', range(steps('container'))),
      pattern('max-w-full'),
    ],
  },
  {
    family: 'Layout',
    patterns: [
      pattern(['block', 'flex', 'inline-flex', 'grid', 'hidden']),
      pattern('flex-', ['col', 'wrap', '1']),
      pattern('shrink-0'),
      pattern('items-', ['start', 'center', 'end']),
      pattern('justify-', ['center', 'end', 'between']),
      pattern(['grid-cols', 'col-span'], '-', ['1', '2', '3', '4', '6', '12']),
      pattern(['relative', 'absolute']),
      pattern('inset-0'),
      pattern('overflow-', ['hidden', 'auto']),
      pattern('sr-only'),
    ],
  },
  {
    family: 'State',
    patterns: [
      pattern('hover:bg-', named('<token>', tintable), ['', '/80', '/90']),
      pattern('hover:underline'),
      pattern('focus-visible:', ['ring-2', 'ring-ring', 'outline-none']),
      pattern('disabled:opacity-50'),
    ],
  },
  {
    family: 'Responsive',
    patterns: [
      pattern(['sm', 'md', 'lg'], ':', ['flex', 'hidden', 'flex-row']),
      pattern(['sm', 'md', 'lg'], ':grid-cols-', ['2', '3', '4']),
    ],
  },
  {
    family: 'Type recipe',
    note: "shadcn's, for `h1`…`h4`, `p`, lists, `code`: see the Type card",
    patterns: [{ text: '', classes: recipe }],
  },
]

const candidates = vocabulary.flatMap(({ patterns }) => patterns.flatMap(({ classes }) => classes))

/**
 * The idiomatic snippet the guidelines end on. Built here so its classes can
 * be checked against the vocabulary: a snippet the stylesheet cannot render
 * fails the build rather than misleading a design tool.
 */
const example = `<div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
  <h3 className="text-lg font-semibold">Deploy</h3>
  <p className="text-sm text-muted-foreground">Tokens only: it follows the dark class.</p>
  <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
    <Rocket className="size-4" /> Deploy
  </button>
</div>`
{
  const known = new Set(candidates)
  const unknown = [...example.matchAll(/className="([^"]*)"/g)]
    .flatMap(([, list]) => list.split(/\s+/))
    .filter((name) => !known.has(name))
  if (unknown.length) throw new Error(`the guidelines example uses classes outside the vocabulary: ${unknown.join(' ')}`)
}

/**
 * What a design is styled with: the stylesheet above, plus what `shadcn init`
 * and `theme` add to a project's base layer — borders and focus rings on the
 * tokens, the body on `background`, and the mono family on the elements the
 * `font-mono` item names.
 */
const designCss = [
  entryCss,
  `@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  ${item('font-mono').font.selector} {
    @apply font-mono;
  }
}`,
].join('\n\n')

/** `hover:bg-primary/90` as Tailwind writes its selector: `.hover\:bg-primary\/90`. */
const selector = (name) => `.${name.replace(/[^\w-]/g, (char) => `\\${char}`)}`

/** Whether `css` has a rule for the class `name`, and not only for a longer one it starts. */
function renders(css, name) {
  const wanted = selector(name)
  for (let at = css.indexOf(wanted); at !== -1; at = css.indexOf(wanted, at + 1)) {
    if (!/[\w\\-]/.test(css[at + wanted.length] ?? '')) return true
  }
  return false
}

/**
 * The design stylesheet. Throws when a class of the vocabulary compiles to
 * nothing: the guidelines would name a class that does nothing.
 */
async function designStylesheet() {
  const css = await compileCss(designCss, candidates)
  const dead = candidates.filter((name) => !renders(css, name))
  if (dead.length) throw new Error(`the vocabulary names classes Tailwind does not generate: ${dead.join(' ')}`)
  return `/* Generated by \`npm run design-bundle\`: the pmndrs theme and every class guidelines.md lists. Do not edit. */
${css}
`
}

/* ------------------------------------------------------------------------ */
/* Guidelines                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * The rules, as instructions: the head of the README a design agent reads
 * first, through the converter's `readmeHeader`. Short on purpose, since it
 * is read before every design: setup, the class vocabulary, where the truth
 * lives, the brand rules and one snippet.
 *
 * Every list in it is derived: the token names, the roles shadcn has no name
 * for, the class table, the icon library, the families, the logo files, the
 * decided/inherited split. The sentences around them are the one copy of
 * these rules written as instructions; the README points here rather than
 * repeating them.
 */
function guidelines() {
  const list = (values) => values.map((value) => `\`${value}\``).join(' ')
  const sans = fonts.find(({ variable }) => variable === '--font-sans')
  const mono = fonts.find(({ variable }) => variable === '--font-mono')
  /** The shadcn tokens past `<token>`: its `-foreground` pairs, then the rest grouped. */
  const foregrounds = tintable.filter((name) => shadcnNames.has(`${name}-foreground`))
  const otherShadcn = shadcnColors.filter(
    (name) => !tintable.includes(name) && !foregrounds.some((head) => name === `${head}-foreground`)
  )

  /** `card` and `card-foreground` as `card{,-foreground}`: names grouped on their first word. */
  const grouped = (names) =>
    [...Map.groupBy(names, (name) => name.split('-')[0])].map(([head, members]) =>
      members.length === 1
        ? members[0]
        : members.includes(head)
          ? `${head}{${members.map((name) => name.slice(head.length)).join(',')}}`
          : `${head}-{${members.map((name) => name.slice(head.length + 1)).join(',')}}`
    )

  /** The #25 split, read off the docs' "Inherited from X" notes. */
  const decided = []
  const inherited = new Map()
  for (const page of Object.values(pages)) {
    const parts = page.inherited ? [{ heading: page.title, inherited: page.inherited }] : page.sections
    if (!page.inherited && !page.sections.some((entry) => entry.inherited)) decided.push(page.title)
    for (const { heading, inherited: from } of parts) {
      if (!from) {
        if (page.sections.some((entry) => entry.inherited)) decided.push(heading)
        continue
      }
      inherited.set(from, [...(inherited.get(from) ?? []), heading])
    }
  }

  const logoFiles = logos.map(({ file }) => file.replace(/^public\//, '').replace(/^pmndrs\/logo_(.+)\.svg$/, '$1'))

  return `<!-- Generated by \`npm run design-bundle\`. Do not edit. -->

# pmndrs design system

No components here: the JS bundle exports nothing, so skip any section below on loading or using components.

## Setup

\`styles.css\` is the whole system: the tokens in light and dark, ${sans.family}, ${mono.family}, and the classes below. Style plain elements, or your own components, with them. Dark mode is the \`dark\` class on \`<html>\`: colours follow it, never write \`dark:\`.

## Classes

Tailwind CSS v4, only these: any other class does nothing. \`{a,b}\` is either, \`{a…z}\` a scale in order (spacing: the Spacing card's), \`<token>\` one of ${list(tintable)}, \`<colour>\` one below.

| Family | Classes |
| --- | --- |
${vocabulary.map(({ family, note, patterns }) => `| ${family} | ${note ?? list(patterns.map(({ text }) => text))} |`).join('\n')}

## Colour

A \`<colour>\` is, by preference:

1. a shadcn token: \`<token>\` ${list([`{${foregrounds.join(',')}}-foreground`, ...grouped(otherShadcn)])};
2. an MD3 role shadcn has no name for: ${list(grouped(md3Colors))};
3. a brand accent, never in place of a token: ${list([`{${brandColors.join(',')}}`])}, each also \`on-\`, \`-container\`, \`on-…-container\`.

## Rules

- Icons: ${preset.values.iconLibrary} only, \`size-4\` or \`size-5\`, coloured with \`text-*\`. No emoji.
- Never hardcode a colour or a font family. Text is ${sans.family}; \`code\` \`kbd\` \`samp\` \`pre\` are ${mono.family} on their own.
- Corners derive from \`--radius: ${radius}\`.
- The logo, \`/pmndrs/logo_{${logoFiles.join(',')}}.svg\`, only on its own black square: never recoloured or cropped.
- Decided by pmndrs: ${decided.join(', ')}. Inherited, never cite them as pmndrs rules: ${[...inherited].map(([from, headings]) => `${headings.join(', ')} (${from})`).join('; ')}.

## Where truth lives

Generated from [pmndrs/design-system](https://github.com/pmndrs/design-system) at a release tag. The cards render the same CSS; these rules win over them. In code: \`npx shadcn@latest add pmndrs/design-system/theme#<tag>\`.

## Example

\`\`\`jsx
${example}
\`\`\`
`
}

/* ------------------------------------------------------------------------ */
/* Outputs                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Every file the script writes, as `[path, content]`, `path` relative to the
 * output folder. Exported rather than written on import, as `build.mjs` does,
 * so `design-bundle.test.mjs` can write them where it checks them.
 */
export const outputs = [
  ...(await Promise.all(markup.map(async (card) => [`cards/${card.file}`, await page(card)]))),
  ['styles.css', await designStylesheet()],
  ['guidelines.md', guidelines()],
]

/** Writes `outputs` into `dir`, emptied first: a card no page produces any more must not linger. */
export function writeDesign(dir) {
  rmSync(dir, { recursive: true, force: true })
  for (const [path, content] of outputs) {
    const url = new URL(path, dir)
    mkdirSync(new URL('./', url), { recursive: true })
    writeFileSync(url, content)
  }
}

/**
 * Copies the cards `writeDesign` left in `designDir` into the converter's
 * `bundleDir`, under `guidelines/cards/`, then refreshes the `auxSha` of its
 * `_ds_sync.json`: that hash covers `guidelines/`, and a stale one would let a
 * re-sync's diff skip a card-only change. The hash comes from the converter's
 * own recipe, staged in `.ds-sync/`, so it agrees with the next build's diff.
 */
export async function placeCards(bundleDir) {
  const sidecar = new URL('_ds_sync.json', bundleDir)
  const anchor = JSON.parse(readFileSync(sidecar, 'utf8'))
  const cards = new URL('guidelines/cards/', bundleDir)
  rmSync(cards, { recursive: true, force: true })
  cpSync(new URL('cards/', designDir), cards, { recursive: true })
  const { auxShaFor } = await import(new URL('.ds-sync/lib/sync-hashes.mjs', root).href)
  anchor.auxSha = auxShaFor(fileURLToPath(bundleDir))
  writeFileSync(sidecar, JSON.stringify(anchor, null, 2) + '\n')
}

if (import.meta.main) {
  const place = process.argv.indexOf('--place')
  if (place === -1) {
    writeDesign(designDir)
    console.log(`built ${outputs.length} files into ${designDir.pathname.replace(root.pathname, '')}`)
  } else {
    const bundleDir = new URL(`${process.argv[place + 1]}/`, root)
    await placeCards(bundleDir)
    console.log(`placed the cards into ${bundleDir.pathname.replace(root.pathname, '')}guidelines/cards/`)
  }
}
