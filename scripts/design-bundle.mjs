/**
 * Generates `design/`, the design system as a design tool reads it.
 *
 * A design tool cannot install a registry item, and it does not read prose
 * written for people who can. What it can read is a page that renders a
 * foundation, and a short list of rules. So `design/` holds:
 *
 *   design/<foundation>.html   one card per foundation page of the docs, and
 *                              one per logo variant: a standalone page, its
 *                              compiled CSS inlined, light and dark side by side
 *   design/guidelines.md       the rules, as instructions
 *
 * Tool-neutral on purpose: any browser opens a card, and any AI tool or person
 * reads the guidelines. The one tool-specific line is each card's first, the
 * `<!-- @dsCard group="…" -->` marker by which Claude Design files the card
 * under a group of its Design System pane. A browser ignores it.
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
 *   preset.json                      the preset code and the icon library
 *
 * So the cards render with the CSS a pmndrs app gets, compiled by Tailwind v4
 * from the same `@plugin`, remap and palette `theme` installs, plus what
 * `shadcn init --preset` writes on top: the `@theme inline` colour names and
 * the base-nova radius scale.
 *
 * Committed, like `registry.json`: a reviewer sees in the diff what a design
 * tool will be handed, and `design-bundle.test.mjs` fails when the committed
 * copy is stale. Nothing in it names a version, so a release never makes it
 * stale — an install address reads `#<tag>`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from 'tailwindcss'
import preset from '../preset.json' with { type: 'json' }
import registry from '../registry.json' with { type: 'json' }
import { pmndrsMtb } from '../registry/md3-base/md3.ts'

const root = new URL('../', import.meta.url)
export const designDir = new URL('../design/', import.meta.url)

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
 * The one stylesheet above, compiled for the utilities `html` uses. A fresh
 * compiler per card, because a Tailwind compiler keeps every candidate it was
 * ever handed: a shared one would give every card the Colors card's 364
 * tonal-palette utilities, and the bundle would weigh twice what it does.
 */
async function stylesheet(html) {
  const compiler = await compile(entryCss, {
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
  const candidates = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/)))
  return compiler.build([...candidates].filter(Boolean)).trim()
}

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
/* Guidelines                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * The rules, as instructions for whoever designs with this: a person, or any
 * AI tool reading the file.
 *
 * Every list in it is derived — the token names, the roles shadcn has no name
 * for, the icon library, the families, the logo files, the decided/inherited
 * split. The sentences around them are the one copy of these rules written
 * as instructions; the README points here rather than repeating them.
 */
function guidelines() {
  const named = new Set(remap.map(({ role }) => role))
  const brandRoles = new Set(brandColors.flatMap((name) => [name, `on-${name}`, `${name}-container`, `on-${name}-container`]))
  // A role whose name shadcn also uses (`secondary`) has no utility of its own:
  // `bg-secondary` is shadcn's, so it is not offered as an MD3 one.
  const unnamed = roles.filter((role) => !named.has(role) && !brandRoles.has(role) && !shadcnNames.has(role))
  const shadowed = roles.filter((role) => shadcnNames.has(role))
  const list = (values) => values.map((value) => `\`${value}\``).join(', ')
  const sans = fonts.find(({ variable }) => variable === '--font-sans')
  const mono = fonts.find(({ variable }) => variable === '--font-mono')
  const icons = preset.values.iconLibrary

  const foundations = Object.values(pages).map((page) => {
    if (page.inherited) return `| ${page.title} | — | all of it, from ${page.inherited} |`
    const inherited = page.sections.filter((entry) => entry.inherited)
    const decided = inherited.length
      ? page.sections.filter((entry) => !entry.inherited).map((entry) => entry.heading).join(', ')
      : 'all of it'
    const rest = inherited.map((entry) => `${entry.heading}, from ${entry.inherited}`).join('; ') || '—'
    return `| ${page.title} | ${decided} | ${rest} |`
  })

  return `<!-- Generated by \`npm run design-bundle\` from the registry sources. Do not edit. -->

# pmndrs design system: guidelines

Rules for designing a pmndrs interface, for a person or for an AI design tool. The cards next to this file (\`*.html\`) render each foundation with the real CSS, in light and dark. Where a card and these rules disagree, the rules win.

The interface is built with [shadcn](https://ui.shadcn.com) and Tailwind CSS v4, with the poimandres preset (\`${preset.code}\`) and the \`theme\` registry item installed. Write Tailwind utility classes, not CSS values.

## Colour

1. Use the shadcn tokens first: ${list(remap.map(({ name }) => name))}. As utilities: \`bg-primary\`, \`text-primary-foreground\`, \`bg-card\`, \`text-muted-foreground\`, \`border-border\`, and so on.
2. Use an MD3 role only where shadcn has no name for it: ${list(unnamed)}. As utilities: \`bg-surface-dim\`, \`bg-tertiary-container\`, \`text-on-tertiary-container\`, and so on. ${list(shadowed)} are shadcn's names too, and there the utility is shadcn's: \`bg-secondary\` is the shadcn \`secondary\`.
3. The brand colours are named: ${list(brandColors)}. Each has four roles, \`bg-<name>\`, \`text-on-<name>\`, \`bg-<name>-container\`, \`text-on-<name>-container\`, and shades \`bg-<name>-50\` to \`bg-<name>-950\`. Use them for accents, not as a substitute for the tokens above.
4. Never write a colour value: no hex, no \`rgb()\`, no \`oklch()\`, no Tailwind stock palette (\`bg-zinc-800\`). Every colour has a light and a dark value, and only a token or a role follows the scheme. Dark is the \`dark\` class on \`<html>\`.

## Icons

5. Use ${icons} icons only. No other icon set, no emoji as an icon.

## Type

6. Never set \`font-sans\` or \`font-mono\` to pick a family for a component. Text inherits ${sans.family}; \`code\`, \`kbd\`, \`samp\` and \`pre\` get ${mono.family} on their own. For monospace text, use one of those elements.
7. Size text with the \`text-*\` scale (\`text-sm\`, \`text-xl\`); weight with \`font-medium\`, \`font-semibold\`.

## Shape and space

8. Round corners with \`rounded-sm\` to \`rounded-4xl\`, all derived from \`--radius\`. Never an arbitrary radius.
9. Space with the spacing scale (\`p-4\`, \`gap-2\`) and elevate with \`shadow-*\`. Both are Tailwind defaults (see below): follow them, but do not treat them as brand rules.

## Logo

10. Show the pmndrs logo only on its own black square: each file paints it, and there is no transparent variant. Never recolour it, crop it, or draw it on another background.
11. Four variants, one file each: ${logos.map(({ variant, file }) => `${variant} (\`/${file.replace(/^public\//, '')}\`)`).join(', ')}.

## Decided and inherited

What pmndrs decided is the brand. What it inherited from Tailwind or shadcn is a default, kept until a decision replaces it: do not cite it as a pmndrs rule.

| Foundation | Decided by pmndrs | Inherited |
| --- | --- | --- |
${foundations.join('\n')}

## Install

\`\`\`sh
npx shadcn@latest init --preset ${preset.code}
npx shadcn@latest add pmndrs/design-system/theme#<tag>
\`\`\`

\`<tag>\` is a release tag of [pmndrs/design-system](https://github.com/pmndrs/design-system/releases).
`
}

/* ------------------------------------------------------------------------ */
/* Outputs                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Every file of the bundle, as `[url, content]`. Exported rather than written
 * on import, as `build.mjs` does: `design-bundle.test.mjs` asserts the
 * committed `design/` against exactly these strings.
 */
export const outputs = [
  ...(await Promise.all(markup.map(async (card) => [new URL(card.file, designDir), await page(card)]))),
  [new URL('guidelines.md', designDir), guidelines()],
]

if (import.meta.main) {
  mkdirSync(designDir, { recursive: true })
  const expected = new Set(outputs.map(([url]) => url.href))
  const changed = []

  // `design/` is generated whole, so a file no card produces any more goes.
  for (const name of readdirSync(designDir)) {
    const url = new URL(name, designDir)
    if (expected.has(url.href)) continue
    rmSync(url, { recursive: true })
    changed.push(`-${url.pathname.replace(root.pathname, '')}`)
  }

  for (const [url, next] of outputs) {
    if (existsSync(url) && readFileSync(url, 'utf8') === next) continue
    writeFileSync(url, next)
    changed.push(url.pathname.replace(root.pathname, ''))
  }

  console.log(changed.length ? `built ${changed.join(', ')}` : `design/ is current (${outputs.length} files)`)
}
