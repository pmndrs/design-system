/**
 * The `v0` item: what an "Open in v0" link opens, and the links themselves.
 * `build.mjs` writes its stylesheet to `registry/v0/globals.css` and the links
 * into the README and the getting-started page; what they are made of is this
 * module's story.
 *
 * Where the CLI path writes the remap (`--primary: var(--md-sys-color-primary)`)
 * and the palette it points at, the stylesheet writes the end of each chain:
 * shadcn's variables, the ones the remap sets, as the literal colours the bake
 * gives their MD3 role, and the MD3 variables themselves, every role and the
 * tonal shades the utilities name, as literals too, in a `:root` and a
 * `.dark`. v0 is trained on shadcn's names, so those come first; the MD3 ones
 * are there for what shadcn has no name for (the containers, the surface
 * levels, the brand colours), under the utility names the MD3 Tailwind plugin
 * gives a pmndrs project, so the code v0 writes runs unchanged in one. The
 * rest is the frame shadcn's own Open in v0 payload writes: the imports, the
 * `@theme inline` mapping with the `--radius-*` scale shadcn derives, and the
 * base layer, plus the two fonts from their Fontsource packages, under the
 * families those register.
 */
import { mtbColors } from 'material-theme-builder/tailwind'
import { pmndrsMtb } from '../registry/md3-base/md3.ts'
import { hostedUrl } from './hosted-registry.mjs'
import { registersFamily } from './packages.mjs'
import { readRemap, tailwindColors } from './remap.mjs'

/**
 * A palette variable followed through its `var()` aliases to the colour.
 *
 * @param {Record<string, string>} block
 * @param {string} name
 */
function literal(block, name) {
  let value = block[name]
  for (let ref; (ref = value?.match(/^var\((--[\w-]+)\)$/)); ) value = block[ref[1]]
  if (!value) throw new Error(`${name} resolves to nothing in the bake`)
  return value
}

/**
 * shadcn's `--radius-*` scale, as the Radius page gives it: every step it
 * derives from `--radius`, by its formula. `--radius-xs` is Tailwind's own
 * rather than derived, so it stays out, as it does in shadcn's.
 *
 * @param {ReturnType<typeof import('./foundations.mjs').readFoundations>['radius']} radius
 */
const radiusScale = (radius) =>
  radius.scale.filter(({ formula }) => formula.includes('var(--radius)')).map(({ token, formula }) => [token, formula])

/**
 * The sans font as the preset installs it, through shadcn's `font-inter`: the
 * Typography page's sans family, under the name its Fontsource package
 * registers (`'Inter Variable', sans-serif`), and that package.
 *
 * @param {ReturnType<typeof import('./foundations.mjs').readFoundations>} foundations
 */
export function sansFont({ typography }) {
  const { family } = typography.fonts.find(({ variable }) => variable === '--font-sans')
  const font = { family: `'${family} Variable', sans-serif`, dependency: `@fontsource-variable/${family.toLowerCase()}` }
  // The name is Fontsource's convention, not something the page says: hold it to the package.
  if (!registersFamily(font.dependency, font.family)) throw new Error(`${font.dependency} registers no ${font.family}`)
  return font
}

/**
 * The brand lime, as a fill and the role meant to go on it. v0 reached for
 * the lime and could not find it: `bg-lime` is a dark olive in light, since a
 * colour seeded at its own hex gives the seed to its container role. So it is
 * the container of the custom colour seeded at the primary's hex,
 * `bg-lime-container`, the same colour as `bg-primary-container`.
 */
const lime = pmndrsMtb.customColors.find(({ hex }) => hex.toLowerCase() === pmndrsMtb.source.toLowerCase()).name
export const brandLime = { fill: `bg-${lime}-container`, on: `text-on-${lime}-container` }

/**
 * The colour utilities the MD3 Tailwind plugin gives a pmndrs project, once
 * its body names the seed's custom colours as `md3-base`'s docs say:
 * `['--color-primary-container', 'var(--md-sys-color-primary-container)']`,
 * the brand and alert colours' roles and shades with them. Less the three
 * names shadcn's own `@theme inline` keeps there (`background`, `primary`,
 * `secondary`): a plugin's colours are defaults, so those stay shadcn's.
 *
 * @param {ReturnType<typeof readRemap>} remap
 * @returns {[string, string][]}
 */
function md3Colors(remap) {
  const shadcn = new Set(tailwindColors(remap).map(([name]) => name))
  return Object.entries(mtbColors({ customColors: pmndrsMtb.customColors.map(({ name }) => name) }))
    .map(([name, value]) => [`--color-${name}`, value])
    .filter(([name]) => !shadcn.has(name))
}

/**
 * The `globals.css` of a v0 project, from the baked palette.
 *
 * @param {{ ':root': Record<string, string>, '.dark': Record<string, string> }} palette the bake, `.dark` carrying only what differs from `:root`
 * @param {ReturnType<typeof import('./foundations.mjs').readFoundations>} foundations
 * @param {{ family: string, dependency: string }} mono the `font-mono` item's font
 */
export function v0GlobalsCss(palette, foundations, mono) {
  const remap = readRemap()
  const sans = sansFont(foundations)
  const modes = { ':root': palette[':root'], '.dark': { ...palette[':root'], ...palette['.dark'] } }
  const declarations = (entries) => entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')
  const resolved = (mode, names) => names.map((name) => [name, literal(modes[mode], name)])

  const md3 = md3Colors(remap)
  // Every role, in both schemes; the tonal shades a utility names, once, since no scheme changes them.
  const roles = Object.keys(palette[':root']).filter((name) => name.startsWith('--md-sys-color-'))
  const shades = [...new Set(md3.map(([, value]) => value.match(/^var\((--md-ref-palette-[\w-]+)\)$/)?.[1]).filter(Boolean))]

  return `/*
 * This is the pmndrs design system palette (not the Poimandres VS Code theme). Do not edit; use these tokens, never a hex.
 *
 * Generated by pmndrs/design-system. shadcn's colours first (bg-primary, bg-card,
 * border-border...), then the Material Design 3 roles for what shadcn has no name
 * for: bg-primary-container, bg-surface-container-high, the brand colours. The
 * brand lime is ${brandLime.fill}, with ${brandLime.on} on it. Every colour is
 * resolved to a literal value; in your own project, install the \`theme\` or
 * \`preset\` registry item instead, and the same utilities follow.
 */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "${sans.dependency}";
@import "${mono.dependency}";

@custom-variant dark (&:is(.dark *));

@theme inline {
${declarations([
  ['--font-sans', sans.family],
  ['--font-heading', 'var(--font-sans)'],
  ['--font-mono', mono.family],
  ...tailwindColors(remap),
  ...md3,
  ...radiusScale(foundations.radius),
])}
}

:root {
${declarations([
  ['--radius', foundations.radius.base],
  ...remap.map(({ name, role }) => [name, literal(modes[':root'], role)]),
  ...resolved(':root', roles),
  ...resolved(':root', shades),
])}
}

.dark {
${declarations([...remap.map(({ name, role }) => [name, literal(modes['.dark'], role)]), ...resolved('.dark', roles)])}
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
  code,
  kbd,
  samp,
  pre {
    @apply font-mono;
  }
}
`
}

/**
 * An Open in v0 link to the hosted `v0` item, its parameters encoded the way
 * v0's button builder and vercel/registry-starter write them.
 *
 * @param {Record<string, string>} params `title`, and `prompt` if any
 */
const openInV0 = (params) => `https://v0.app/chat/api/open?${new URLSearchParams({ url: `${hostedUrl}v0.json`, ...params })}`

/**
 * The Open in v0 link to the theme starter. `build.mjs` rewrites links in
 * the README and getting-started page by title so they share this URL.
 */
export const v0Links = {
  theme: openInV0({ title: 'pmndrs' }),
}

/**
 * A page with its Open in v0 links made the current ones, each picked by its
 * `title`. A link with a title not above is an error, not something to leave
 * as it is.
 *
 * @param {string} text
 */
export function rewriteV0Links(text) {
  const byTitle = new Map(Object.values(v0Links).map((link) => [new URL(link).searchParams.get('title'), link]))
  return text.replace(/https:\/\/v0\.app\/chat\/api\/open\?[^\s)"']+/g, (link) => {
    const title = new URL(link).searchParams.get('title')
    if (!byTitle.has(title)) throw new Error(`no Open in v0 link titled ${title}: ${link}`)
    return byTitle.get(title)
  })
}
