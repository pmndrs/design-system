/**
 * `registry.json` is generated, so most of it is already pinned: `build.test.mjs`
 * (in `npm run lgtm`) compares the output to what is committed, which fixes anything that is a pure
 * function of the inputs. Asserting those here would only restate the build.
 *
 * What `build.test.mjs` cannot catch is a bad *input*. Mistype a variable in the
 * shadcn remap, add a `cssVars` block, point a dependency at an item that does
 * not exist — rebuild, and the output is faithfully current and wrong. These
 * assert the coherence the generator never checks.
 *
 * Schema and `files[].path` existence belong to `shadcn registry validate`,
 * which covers both.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { isDeepStrictEqual } from 'node:util'
import { builder } from 'material-theme-builder'
import registry from './registry.json' with { type: 'json' }
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { outputs as artifactOutputs } from './scripts/artifact.mjs'
import { readFoundations } from './scripts/foundations.mjs'

/** Every `--name: value` pair under an item's `css`, at any nesting depth. */
function declarations(css, found = []) {
  for (const [key, value] of Object.entries(css ?? {})) {
    if (typeof value === 'object') declarations(value, found)
    else if (key.startsWith('--')) found.push([key, value])
  }
  return found
}

const declared = registry.items.flatMap((item) => declarations(item.css))
/**
 * Plus what `md3-base`'s `@import` declares: the remap, shadcn's variables set
 * to MD3 roles, as the package ships it.
 */
const remapCss = readFileSync(new URL(import.meta.resolve('material-theme-builder/shadcn.css')), 'utf8')
const remapped = [...remapCss.matchAll(/^\s*(--[\w-]+):\s*var\(--md-/gm)].map(([, name]) => name)
const names = new Set([...declared.map(([name]) => name), ...remapped])

/**
 * Registry-wide rather than per item, deliberately: `md3-base` is the layer
 * without colours, so its remap points at `--md-sys-color-*` that `theme` supplies
 * — or that a runtime `<Mtb>` injects. Only together do the references close.
 *
 * A dangling one is silent everywhere else. CSS drops the declaration, the
 * element keeps whatever it inherited, and the page renders looking plausible.
 */
test('every var() reference resolves to a variable the registry declares', () => {
  const dangling = declared.flatMap(([name, value]) =>
    [...value.matchAll(/var\(\s*(--[\w-]+)/g)]
      .map(([, reference]) => reference)
      .filter((reference) => !names.has(reference))
      .map((reference) => `${name} references ${reference}, which nothing declares`)
  )

  assert.deepEqual(dangling, [])
})

/**
 * shadcn derives an `@theme inline` entry from every `cssVars` it is handed, and
 * builds the reference by prefixing `--` — so an already-prefixed MD3 name lands
 * as `var(----md-ref-palette-primary-40)`, one junk Tailwind theme name per
 * variable. The palette belongs in `css`; this keeps it there.
 *
 * A colour in `cssVars` is worse still: it lands in `:root` after the remap's
 * `@import`, and overrides it. The one exception is the preset, for what
 * shadcn only knows how to write from `cssVars`, none of it a colour value:
 * `radius`, from which it derives the `--radius-*` scale, and in `@theme
 * inline` the heading font and the Tailwind colour of each remapped variable.
 */
test('no item declares cssVars but the preset, and it no colour', () => {
  const allowed = new Set([
    'preset light.radius',
    'preset theme.--font-heading: var(--font-sans)',
    ...remapped.map((name) => `preset theme.--color-${name.slice(2)}: var(${name})`),
  ])
  const offenders = registry.items.flatMap((item) =>
    Object.entries(item.cssVars ?? {}).flatMap(([block, vars]) =>
      Object.entries(vars)
        .map(([name, value]) => (block === 'theme' ? `${item.name} ${block}.${name}: ${value}` : `${item.name} ${block}.${name}`))
        .filter((declaration) => !allowed.has(declaration))
    )
  )

  assert.deepEqual(offenders, [])
})

/** An item's `registryDependencies` on this registry, as bare item names. */
function ownDependencies(item) {
  const self = new URL(registry.homepage).pathname.slice(1)
  return (item.registryDependencies ?? [])
    .filter((dependency) => dependency.startsWith(`${self}/`))
    .map((dependency) => dependency.slice(self.length + 1).split('#')[0])
}

/**
 * A ref is not inherited, so a cross-item dependency carries its own address.
 * The version half is derived from package.json at build time; the item name is
 * hand-written, and resolves to a 404 at install time if it drifts.
 */
test('registryDependencies on this registry name items it defines', () => {
  const own = new Set(registry.items.map((item) => item.name))

  const dangling = registry.items.flatMap((item) => ownDependencies(item).filter((name) => !own.has(name)))

  assert.deepEqual(dangling, [])
})

/**
 * `theme` is the one documented install target: the palette, the colour
 * machinery under it and the mono font. Drop a dependency and the install
 * still succeeds — it just ships without that piece, and nothing else notices.
 */
test('theme is the entry item, and pulls in md3-base and font-mono', () => {
  const theme = registry.items.find((item) => item.name === 'theme')

  assert.ok(theme, 'no `theme` item')
  assert.deepEqual(ownDependencies(theme).sort(), ['font-mono', 'md3-base'])
})

/**
 * Renamed to `theme`, pre-1.0, with no alias: a leftover `md3` would be a
 * second entry point the docs no longer describe.
 */
test('no md3 item remains', () => {
  assert.equal(
    registry.items.some((item) => item.name === 'md3'),
    false
  )
})

/** Why the selector is mandatory: see the `font-mono` item in `scripts/build.mjs`. */
test('font-mono is a registry:font on --font-mono, scoped below html', () => {
  const fontMono = registry.items.find((item) => item.name === 'font-mono')

  assert.ok(fontMono, 'no `font-mono` item')
  assert.equal(fontMono.type, 'registry:font')
  assert.equal(fontMono.font?.variable, '--font-mono')
  assert.ok(fontMono.font.selector, '`font-mono` has no selector, so shadcn would apply it to `html`')
  assert.notEqual(fontMono.font.selector.trim(), 'html')
})

/**
 * `shadcn init <url>` on the hosted `preset` has to configure what
 * `shadcn init --preset b1VlIttI` does, plus the theme: `preset.json` is the
 * reviewable form of that preset, so the item is held to it. A `registry:style`
 * cannot carry these choices (init falls back to `new-york`); a
 * `registry:base` carries them in `config`, as the item shadcn serves for a
 * preset code does.
 */
test('preset is a registry:base carrying the poimandres preset and the theme', () => {
  const item = registry.items.find((entry) => entry.name === 'preset')
  const { values } = JSON.parse(readFileSync(new URL('./preset.json', import.meta.url), 'utf8'))

  assert.ok(item, 'no `preset` item')
  assert.equal(item.type, 'registry:base')
  // Not on top of shadcn's stock style: the preset is the whole style.
  assert.equal(item.extends, 'none')
  // A real shadcn style, or every later `shadcn add button` 404s.
  assert.deepEqual(
    {
      style: item.config?.style,
      iconLibrary: item.config?.iconLibrary,
      baseColor: item.config?.tailwind?.baseColor,
      menuColor: item.config?.menuColor,
      menuAccent: item.config?.menuAccent,
    },
    {
      style: `base-${values.style}`,
      iconLibrary: values.iconLibrary,
      baseColor: values.baseColor,
      menuColor: values.menuColor,
      menuAccent: values.menuAccent,
    }
  )
  assert.ok(item.registryDependencies.includes(`font-${values.font}`), `no font-${values.font}`)
  assert.deepEqual(ownDependencies(item), ['theme'])
  // `radius: default`, as the Radius page gives it.
  assert.equal(item.cssVars?.light?.radius, readFoundations().radius.base)
  // The stylesheet lines the preset's own item writes, which `extends: none` no longer brings.
  for (const line of ['@import "tw-animate-css"', '@import "shadcn/tailwind.css"', '@layer base']) {
    assert.ok(item.css?.[line], `no ${line}`)
  }
})

/**
 * shadcn writes `--color-card: var(--card)` and the rest into `@theme inline`
 * from the colours in `cssVars`, and the preset has none: without its own
 * mapping, `bg-card` and `border-border` do not exist, and the base layer's
 * `@apply border-border` fails the Tailwind build (measured with a Vite app
 * on shadcn 4.18). The MD3 plugin maps the MD3 role names only. So the preset
 * maps every variable the remap sets, as shadcn would have, from
 * `cssVars.theme`: `css` cannot put a declaration in `@theme inline`.
 */
test('the preset maps every shadcn variable the remap sets to a Tailwind colour', () => {
  const item = registry.items.find((entry) => entry.name === 'preset')
  const theme = item.cssVars?.theme ?? {}

  const missing = remapped.filter((name) => theme[`--color-${name.slice(2)}`] !== `var(${name})`)
  assert.deepEqual(missing, [])
})

/** The families a Fontsource package's stylesheet registers, by `@font-face`. */
const registeredFamilies = (dependency) =>
  new Set(
    [...readFileSync(new URL(import.meta.resolve(dependency)), 'utf8').matchAll(/font-family:\s*'([^']+)'/g)].map(
      ([, family]) => family
    )
  )

/** The first family of a `font-family` value, unquoted: `Inter Variable` of `'Inter Variable', sans-serif`. */
const firstFamily = (value) => value.split(',')[0].trim().replace(/^['"]|['"]$/g, '')

/**
 * Outside Next, shadcn imports `font.dependency` and writes `font.family` as
 * `--font-mono`. The family has to be the one that stylesheet registers:
 * `@fontsource-variable/inconsolata` registers `Inconsolata Variable`, and a
 * bare `Inconsolata` renders only where the font happens to be installed
 * locally, and in the fallback everywhere else.
 */
test('font-mono names the family its dependency registers', () => {
  const { font } = registry.items.find((item) => item.name === 'font-mono')

  assert.ok(registeredFamilies(font.dependency).has(firstFamily(font.family)), `${font.dependency} registers no ${font.family}`)
})

/**
 * "The hex a designer picks is the hex the site renders" holds by construction
 * — the CSS and the Figma tokens come off one `builder()` — and this holds it by
 * test too: every Figma role, followed through its aliases, against the same
 * role in the baked CSS.
 */
test('every Figma role resolves to the hex the baked CSS gives it', () => {
  const css = registry.items.find((item) => item.name === 'theme').css
  const resolveCss = (block, name) => {
    let value = block[name] ?? css[':root'][name]
    for (let ref; (ref = value?.match(/^var\((--[\w-]+)\)$/)); ) value = block[ref[1]] ?? css[':root'][ref[1]]
    return value?.toLowerCase()
  }

  const mismatches = []
  for (const [mode, block] of [['Light', css[':root']], ['Dark', css['.dark']]]) {
    const tokens = JSON.parse(readFileSync(new URL(`./figma/${mode}.tokens.json`, import.meta.url), 'utf8'))
    const resolveFigma = (value) => {
      while (typeof value === 'string') value = value.slice(1, -1).split('.').reduce((node, key) => node[key], tokens).$value
      return value.hex.toLowerCase()
    }
    const walk = (node) => {
      if (node.$value && node.$extensions?.['css.variable']) {
        const name = node.$extensions['css.variable']
        const [figma, baked] = [resolveFigma(node.$value), resolveCss(block, name)]
        if (figma !== baked) mismatches.push(`${mode} ${name}: Figma ${figma}, CSS ${baked}`)
      } else if (typeof node === 'object') Object.values(node).forEach(walk)
    }
    walk(tokens.sys)
  }

  assert.deepEqual(mismatches, [])
})

/**
 * The bake is Material Theme Builder's output as it comes, with nothing redrawn
 * on top: a site that computes the palette at runtime from `pmndrsMtb` —
 * `builder()` or `<Mtb>` — renders every role in the same colour as the baked
 * `theme`. Compared resolved, through the `var()` aliases, so this pins what a
 * page shows rather than how the build happens to write it.
 *
 * `build.test.mjs` cannot catch a departure: it compares against what `build.mjs`
 * writes, so a step redrawing the palette there would be current and pass.
 */
test('the baked palette is what builder(pmndrsMtb) renders', () => {
  const css = registry.items.find((item) => item.name === 'theme').css
  const { source, ...options } = pmndrsMtb
  const runtime = Object.fromEntries(
    [...builder(source, options).toCss().matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => [
      selector.trim(),
      Object.fromEntries(
        body
          .split(';')
          .map((declaration) => declaration.trim())
          .filter(Boolean)
          .map((declaration) => [declaration.slice(0, declaration.indexOf(':')).trim(), declaration.slice(declaration.indexOf(':') + 1).trim()])
      ),
    ])
  )

  // `.dark` matches `<html>` along with `:root`, so a mode is `:root` with `.dark` on top.
  const resolve = (block, name) => {
    let value = block[name]
    for (let ref; (ref = value?.match(/^var\((--[\w-]+)\)$/)); ) value = block[ref[1]]
    return value?.toLowerCase()
  }
  const mismatches = []
  for (const [mode, baked, computed] of [
    ['light', css[':root'], runtime[':root']],
    ['dark', { ...css[':root'], ...css['.dark'] }, { ...runtime[':root'], ...runtime['.dark'] }],
  ]) {
    for (const name of new Set([...Object.keys(baked), ...Object.keys(computed)])) {
      const [got, want] = [resolve(baked, name), resolve(computed, name)]
      if (got !== want) mismatches.push(`${mode} ${name}: baked ${got}, builder() ${want}`)
    }
  }

  assert.deepEqual(mismatches, [])
})

/** Every `registry:file` this registry ships, with the item it belongs to. */
const shipped = registry.items.flatMap((item) =>
  (item.files ?? []).filter((file) => file.type === 'registry:file').map((file) => ({ item: item.name, ...file }))
)
const read = ({ path }) => readFileSync(new URL(path, import.meta.url), 'utf8')

/**
 * A `registry:file` is copied to its `target` and nowhere else, so the target
 * is the whole contract — and only `~/` means the project root. Anything else
 * shadcn resolves itself, and in an app with a `src/` directory a bare
 * `public/pmndrs/logo.svg` lands at `src/public/pmndrs/logo.svg`: installed,
 * and served by nothing. Nothing downstream would notice — the file exists,
 * just where no one serves it — so this is the one place that catches it.
 *
 * `v0` is the exception: v0 reads it, not the shadcn CLI, into a project whose
 * layout is fixed, so it targets `app/globals.css` the way shadcn's own Open in
 * v0 payload does. Its own test below holds that.
 */
test('every registry:file has a target at the project root', () => {
  const offenders = shipped
    .filter((file) => file.item !== 'v0')
    .filter((file) => !file.target?.startsWith('~/'))
    .map((file) => `${file.item}: ${file.path} targets ${file.target ?? 'nothing'}`)

  assert.deepEqual(offenders, [])
})

/**
 * Shipped as text and copied byte for byte, so a broken file reaches every
 * consumer as is — and an SVG fails quietly, as a broken image.
 *
 * Node has no XML parser, and one test is no reason to add a dependency, so
 * this checks what a browser needs before it will draw a standalone file in an
 * `<img>`: an `<svg>` root, in the SVG namespace, and closed. Without the
 * `xmlns`, the same markup renders inline and not as a file.
 */
test('every shipped SVG is a standalone SVG document', () => {
  const offenders = shipped
    .filter((file) => file.path.endsWith('.svg'))
    .filter((file) => {
      const svg = read(file).trim()
      const root = svg.replace(/^<\?xml[^>]*\?>\s*/, '').match(/^<svg\b[^>]*>/)?.[0]
      return !root?.includes('xmlns="http://www.w3.org/2000/svg"') || !svg.endsWith('</svg>')
    })
    .map((file) => `${file.item}: ${file.path}`)

  assert.deepEqual(offenders, [])
})

/**
 * A token file a design tool cannot read is a silent failure too: Figma
 * refuses the import, and nothing on the code side ever opens it. Parsed, and
 * held to the one DTCG rule a reader relies on first — a token is a `$value`.
 */
test('every shipped JSON file parses, with DTCG tokens in it', () => {
  const hasToken = (node) =>
    typeof node === 'object' && node !== null && ('$value' in node || Object.values(node).some(hasToken))

  const offenders = shipped
    .filter((file) => file.path.endsWith('.json'))
    .flatMap((file) => {
      try {
        return hasToken(JSON.parse(read(file))) ? [] : [`${file.item}: ${file.path} has no token`]
      } catch (error) {
        return [`${file.item}: ${file.path} does not parse: ${error.message}`]
      }
    })

  assert.deepEqual(offenders, [])
})

/*
 * The foundation tokens: `figma/Foundations.tokens.json`, the values a Figma
 * variable can hold, and `figma/Styles.tokens.json`, the composites built on
 * them. Their source is the foundations pages of the docs, so every value is
 * held against the page that decides it, read through the same
 * `scripts/foundations.mjs` the artifact reads.
 */

/** A committed Figma token file, parsed. */
const figmaFile = (name) => JSON.parse(readFileSync(new URL(`./figma/${name}`, import.meta.url), 'utf8'))

/** Every token of a DTCG file, as its alias path (`spacing.0_5`) to the token. */
function tokensOf(file) {
  const found = new Map()
  const walk = (node, path) => {
    if ('$value' in node) return found.set(path.join('.'), node)
    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith('$') && typeof child === 'object') walk(child, [...path, key])
    }
  }
  walk(file, [])
  return found
}

const variables = tokensOf(figmaFile('Foundations.tokens.json'))
const foundations = readFoundations()

/** `0.5` as a token name: a DTCG name cannot hold a dot, the separator of an alias path. */
const tokenName = (step) => step.replaceAll('.', '_')

const px = (value) => ({ value, unit: 'px' })

test('every spacing step of the Spacing page is a px dimension variable, scoped to gaps and sizes', () => {
  assert.deepEqual(variables.get('spacing.4').$value, px(16))
  for (const { step, pixels } of foundations.spacing.scale) {
    const token = variables.get(`spacing.${tokenName(step)}`)
    assert.ok(token, `no spacing.${tokenName(step)} variable`)
    assert.equal(token.$type, 'dimension')
    assert.deepEqual(token.$value, px(pixels), `spacing ${step}`)
    assert.deepEqual(token.$extensions['com.figma.scopes'], ['GAP', 'WIDTH_HEIGHT'])
  }
})

test('every radius step of the Radius page is a px dimension variable, scoped to corners', () => {
  assert.deepEqual(variables.get('radius.lg').$value, px(10))
  for (const { token: name, pixels } of foundations.radius.scale) {
    const token = variables.get(`radius.${name.replace('--radius-', '')}`)
    assert.ok(token, `no variable for ${name}`)
    assert.equal(token.$type, 'dimension')
    assert.deepEqual(token.$value, px(pixels), name)
    assert.deepEqual(token.$extensions['com.figma.scopes'], ['CORNER_RADIUS'])
  }
})

/**
 * Figma imports a font family as one name, never a stack, and binds a number
 * variable on a line height as pixels: so a line height is its px, not the
 * multiplier CSS writes.
 */
test('the font families, sizes, line heights and weights of the Typography page are variables', () => {
  assert.deepEqual(variables.get('font.family.sans').$value, 'Inter')
  assert.deepEqual(variables.get('font.size.xs').$value, px(12))
  assert.deepEqual(variables.get('font.line-height.xs').$value, 16)
  assert.deepEqual(variables.get('font.weight.normal').$value, 400)

  const expected = [
    ...foundations.typography.fonts.map(({ utility, family }) => [`font.family.${utility.replace('font-', '')}`, 'fontFamily', family, 'FONT_FAMILY']),
    ...foundations.typography.scale.flatMap(({ utility, pixels }) => [
      [`font.size.${utility.replace('text-', '')}`, 'dimension', px(pixels.fontSize), 'FONT_SIZE'],
      [`font.line-height.${utility.replace('text-', '')}`, 'number', pixels.lineHeight, 'LINE_HEIGHT'],
    ]),
    ...foundations.typography.weights.map(({ utility, value }) => [`font.weight.${utility.replace('font-', '')}`, 'number', value, 'FONT_WEIGHT']),
  ]
  for (const [path, $type, $value, scope] of expected) {
    const token = variables.get(path)
    assert.ok(token, `no ${path} variable`)
    assert.deepEqual([token.$type, token.$value, token.$extensions['com.figma.scopes']], [$type, $value, [scope]], path)
  }
})

/** `150ms` as Figma imports a duration: in seconds, the one unit it takes. */
const seconds = (ms) => ({ value: parseFloat(ms) / 1000, unit: 's' })

/** `cubic-bezier(0.4, 0, 0.2, 1)` as its four numbers; `linear` is the straight curve. */
const curve = (css) => (css === 'linear' ? [0, 0, 1, 1] : css.match(/^cubic-bezier\((.+)\)$/)[1].split(',').map(Number))

test('the durations and ease curves of the Motion page are variables, the defaults among them', () => {
  assert.deepEqual(variables.get('duration.150').$value, { value: 0.15, unit: 's' })
  assert.deepEqual(variables.get('ease.in-out').$value, [0.4, 0, 0.2, 1])

  const { defaults, durations, easings } = foundations.motion
  const fallback = (variable) => defaults.find((row) => row.variable === variable).value
  const expected = [
    ...durations.map(({ utility, value }) => [`duration.${utility.replace('duration-', '')}`, 'duration', seconds(value)]),
    ['duration.default', 'duration', seconds(fallback('--default-transition-duration'))],
    ...easings.map(({ utility, value }) => [`ease.${utility.replace('ease-', '')}`, 'cubicBezier', curve(value)]),
    ['ease.default', 'cubicBezier', curve(fallback('--default-transition-timing-function'))],
  ]
  for (const [path, $type, $value] of expected) {
    const token = variables.get(path)
    assert.ok(token, `no ${path} variable`)
    assert.deepEqual([token.$type, token.$value], [$type, $value], path)
    // No Figma picker takes a duration or a curve: the variables are offered in none.
    assert.deepEqual(token.$extensions['com.figma.scopes'], [], path)
  }
})

/**
 * The styles file is a Tokens Studio single file: its top-level keys are token
 * sets, beside `$themes` and `$metadata`. A reference resolves across the
 * sets, so the tokens of every set share one namespace.
 */
const stylesFile = figmaFile('Styles.tokens.json')
const styles = new Map(
  Object.entries(stylesFile)
    .filter(([key]) => !key.startsWith('$'))
    .flatMap(([, set]) => [...tokensOf(set)])
)

/** `{font.size.xs}` as `font.size.xs`, or `null` for a literal. */
const aliasOf = (value) => (typeof value === 'string' && value.match(/^\{([^{}]+)\}$/)?.[1]) || null

/** Tokens Studio writes a dimension `12px`; the variables file, as DTCG 2025.10 does. */
const asVariable = (value) => (typeof value === 'string' && /^-?[\d.]+px$/.test(value) ? px(parseFloat(value)) : value)

/** The types of DTCG 2025.10: a reader rejects, or silently skips, any other. */
const dtcgTypes = new Set(
  'color dimension fontFamily fontWeight duration cubicBezier number strokeStyle border transition shadow gradient typography'.split(' ')
)

test('every Figma token has a DTCG $type', () => {
  const offenders = ['Light', 'Dark', 'Foundations']
    .flatMap((name) => [...tokensOf(figmaFile(`${name}.tokens.json`))].map(([path, token]) => [`${name}: ${path}`, token]))
    .concat([...styles].map(([path, token]) => [`Styles: ${path}`, token]))
    .filter(([, { $type }]) => !dtcgTypes.has($type))
    .map(([path, { $type }]) => `${path} is ${$type}`)

  assert.deepEqual(offenders, [])
})

test('figma-tokens ships the colour modes, the variables and the styles into design/tokens/pmndrs/', () => {
  const item = registry.items.find((entry) => entry.name === 'figma-tokens')
  assert.deepEqual(
    item.files.map(({ path, target }) => [path, target]),
    ['Light', 'Dark', 'Foundations', 'Styles'].map((name) => [`figma/${name}.tokens.json`, `~/design/tokens/pmndrs/${name}.tokens.json`])
  )
})

test('the styles file lists its sets in order, and nothing for Tokens Studio to theme', () => {
  assert.deepEqual(stylesFile.$metadata, { tokenSetOrder: ['foundations', 'styles'] })
  assert.deepEqual(stylesFile.$themes, [])
})

/**
 * Tokens Studio binds a style to a Figma variable by name, `font/size/xs` for
 * `{font.size.xs}`: an alias that names no variable creates a style with the
 * value typed in, which drifts the day the variable changes.
 */
test('every alias of the styles file resolves, to a variable of the same value', () => {
  const problems = []
  for (const [path, token] of styles) {
    const values = typeof token.$value === 'object' ? Object.values(token.$value).flatMap((value) => (typeof value === 'object' ? Object.values(value) : [value])) : [token.$value]
    for (const alias of values.map(aliasOf).filter(Boolean)) {
      const [style, variable] = [styles.get(alias), variables.get(alias)]
      if (!style) problems.push(`${path}: {${alias}} resolves to no token of the styles file`)
      else if (!variable) problems.push(`${path}: {${alias}} names no variable`)
      else if (!isDeepStrictEqual(asVariable(style.$value), variable.$value))
        problems.push(`${path}: {${alias}} is ${JSON.stringify(style.$value)}, the variable ${JSON.stringify(variable.$value)}`)
    }
  }
  assert.deepEqual(problems, [])
})

test('every step of the type scale is a text style, in Inter at the normal weight', () => {
  const scale = foundations.typography.scale.map(({ utility }) => utility.replace('text-', ''))
  assert.deepEqual(
    [...styles].filter(([, { $type }]) => $type === 'typography').map(([path]) => path),
    scale.map((step) => `text.${step}`)
  )
  for (const step of scale) {
    assert.deepEqual(styles.get(`text.${step}`).$value, {
      fontFamily: '{font.family.sans}',
      fontSize: `{font.size.${step}}`,
      fontWeight: '{font.weight.normal}',
      lineHeight: `{font.line-height.${step}}`,
    })
  }
})

/**
 * `0 1px 3px 0 rgb(0 0 0 / 0.1), …` as the layers Tokens Studio writes:
 * `x`, `y`, `blur`, `spread` and `type`, and an `rgba()` colour.
 */
function layers(css, type) {
  return css.split(/,\s*(?![^()]*\))/).map((layer) => {
    const [, inset, lengths, r, g, b, alpha] = layer.match(/^(inset )?([^r]*)rgba?\((\d+),? (\d+),? (\d+),? \/? ?([\d.]+)\)$/)
    const [x, y, blur = '0px', spread = '0px'] = lengths.trim().split(/\s+/).map((length) => `${parseFloat(length)}px`)
    return { x, y, blur, spread, color: `rgba(${r}, ${g}, ${b}, ${alpha})`, type: inset ? 'innerShadow' : type }
  })
}

test('every shadow of the Shadows page is an effect style, layer for layer', () => {
  assert.deepEqual(styles.get('shadow.sm').$value, [
    { x: '0px', y: '1px', blur: '3px', spread: '0px', color: 'rgba(0, 0, 0, 0.1)', type: 'dropShadow' },
    { x: '0px', y: '1px', blur: '2px', spread: '-1px', color: 'rgba(0, 0, 0, 0.1)', type: 'dropShadow' },
  ])
  assert.deepEqual(styles.get('inset-shadow.2xs').$value, [
    { x: '0px', y: '1px', blur: '0px', spread: '0px', color: 'rgba(0, 0, 0, 0.05)', type: 'innerShadow' },
  ])
  const { box, inset, drop } = foundations.shadows
  const expected = [...box, ...inset, ...drop].map(({ utility, value }) => [
    utility.replace(/-(?=[^-]+$)/, '.'),
    utility.startsWith('inset') ? layers(value, 'innerShadow') : layers(value, 'dropShadow'),
  ])
  assert.deepEqual(
    [...styles].filter(([, { $type }]) => $type === 'shadow').map(([path, { $value }]) => [path, $value]),
    expected
  )
})

/**
 * The Claude Design artifact carries the same foundations in its own
 * `tokens.json`, in rem where Figma takes pixels. Built apart from the Figma
 * files, so this is where the two would be seen to disagree.
 */
test('the artifact tokens and the Figma tokens agree on every value they share', () => {
  const artifact = JSON.parse(artifactOutputs.find(([path]) => path === 'tokens.json')[1])
  const pixels = (rem) => parseFloat(rem) * 16
  const problems = []
  const agree = (what, artifactValue, figmaValue) => {
    if (!isDeepStrictEqual(artifactValue, figmaValue)) problems.push(`${what}: artifact ${JSON.stringify(artifactValue)}, Figma ${JSON.stringify(figmaValue)}`)
  }

  for (const { name, value } of artifact.spacing.tokens.filter(({ name }) => name !== 'spacing')) {
    agree(name, px(pixels(value)), variables.get(`spacing.${tokenName(name.replace('spacing-', ''))}`)?.$value)
  }
  for (const { name, value } of artifact.radius.tokens.filter(({ name }) => name !== 'radius')) {
    agree(name, px(pixels(value)), variables.get(`radius.${name.replace('radius-', '')}`)?.$value)
  }
  for (const [key, stack] of Object.entries(artifact.type.families)) {
    agree(`font ${key}`, stack.split(',')[0], variables.get(`font.family.${key}`)?.$value)
  }
  for (const { name, fontSize, lineHeight } of artifact.type.groups.find((group) => group.name === 'Text').styles) {
    const step = name.replace('text-', '')
    agree(`${name} size`, px(pixels(fontSize)), variables.get(`font.size.${step}`)?.$value)
    const leading = typeof lineHeight === 'number' ? lineHeight * pixels(fontSize) : pixels(lineHeight)
    agree(`${name} line height`, leading, variables.get(`font.line-height.${step}`)?.$value)
  }
  for (const { name, value } of [...artifact.shadow.tokens, ...artifact.dropShadow.tokens]) {
    const figma = styles.get(name.replace(/-(?=[^-]+$)/, '.'))?.$value
    agree(name, layers(value, name.startsWith('inset') ? 'innerShadow' : 'dropShadow'), figma)
  }

  assert.deepEqual(problems, [])
})

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

/** One brand book: what the item installs says what the Guidelines page says. */
test('Guidelines.md carries the text of the Guidelines page', () => {
  const [file] = registry.items.find((item) => item.name === 'guidelines').files
  // Each with its own title: frontmatter on the page, a `#` heading in the file.
  const body = (text) =>
    text
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .replace(/^\s*# .*\n/, '')
      .trim()

  assert.equal(body(read(file)), body(guidelinesPage()))
})

/**
 * Open in v0 drops `css`, `cssVars` and namespaces, and resolves no GitHub
 * address (shadcn's Open in v0 docs; vercel/registry-starter and shadcn's own
 * create flow both ship the theme as a file). So the item it opens carries the
 * theme as one file, `app/globals.css` of v0's Next.js project, and depends on
 * nothing but absolute URLs.
 */
const v0 = () => registry.items.find((item) => item.name === 'v0')

test('the v0 item ships the theme as the globals.css of a v0 project, and nothing v0 drops', () => {
  const item = v0()

  assert.ok(item, 'no `v0` item')
  assert.equal(item.type, 'registry:item')
  assert.deepEqual(
    item.files.map(({ type, target }) => ({ type, target })),
    [{ type: 'registry:file', target: 'app/globals.css' }]
  )
  assert.equal(item.css, undefined)
  assert.equal(item.cssVars, undefined)
  const relative = (item.registryDependencies ?? []).filter((dependency) => !dependency.startsWith('https://'))
  assert.deepEqual(relative, [])
})

/** The declarations of the top-level `selector { … }` block of a stylesheet. */
function block(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const body = css.match(new RegExp(`^${escaped} \\{([^}]*)\\}`, 'm'))?.[1]
  assert.ok(body, `no \`${selector}\` block`)
  return Object.fromEntries(
    body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => [
        declaration.slice(0, declaration.indexOf(':')).trim(),
        declaration.slice(declaration.indexOf(':') + 1).trim(),
      ])
  )
}

const globalsCss = () => read(v0().files[0])

/**
 * Without the palette, the shadcn variables have to be literal colours, and
 * the right ones: each the hex the remap's MD3 role has. Checked against the
 * Figma tokens, which come off the palette by a different path than the CSS
 * bake, and against the remap as the package ships it.
 */
test('the v0 globals.css gives every shadcn variable the hex of its MD3 role, light and dark', () => {
  const remap = block(remapCss, ':root:root,\n.dark.dark')
  const css = globalsCss()

  const mismatches = []
  for (const [mode, selector] of [
    ['Light', ':root'],
    ['Dark', '.dark'],
  ]) {
    const tokens = JSON.parse(readFileSync(new URL(`./figma/${mode}.tokens.json`, import.meta.url), 'utf8'))
    const hexOf = {}
    const walk = (node) => {
      if (node?.$value && node.$extensions?.['css.variable']) {
        let value = node.$value
        while (typeof value === 'string') value = value.slice(1, -1).split('.').reduce((n, key) => n[key], tokens).$value
        hexOf[node.$extensions['css.variable']] = value.hex.toLowerCase()
      } else if (typeof node === 'object') Object.values(node).forEach(walk)
    }
    walk(tokens.sys)

    const declared = block(css, selector)
    for (const [name, value] of Object.entries(remap)) {
      const role = value.match(/^var\((--[\w-]+)\)$/)[1]
      if (declared[name]?.toLowerCase() !== hexOf[role]) {
        mismatches.push(`${mode} ${name}: ${declared[name]}, ${role} is ${hexOf[role]}`)
      }
    }
  }

  assert.deepEqual(mismatches, [])
})

/**
 * v0 reads no `registry:font`, so the fonts come with the file: imported from
 * their Fontsource packages, which the item installs, under the family each
 * one registers. The radius is the Radius page's.
 */
test('the v0 globals.css sets the radius and both fonts, and declares every variable it uses', () => {
  const css = globalsCss()
  const theme = block(css, '@theme inline')
  const root = block(css, ':root')

  assert.equal(root['--radius'], readFoundations().radius.base)
  for (const [variable, dependency] of [
    ['--font-sans', '@fontsource-variable/inter'],
    ['--font-mono', '@fontsource-variable/inconsolata'],
  ]) {
    assert.ok(css.includes(`@import "${dependency}";`), `no import of ${dependency}`)
    assert.ok(
      v0().dependencies.some((name) => name.replace(/(.)@[^@/]*$/, '$1') === dependency),
      `${dependency} not installed`
    )
    assert.ok(registeredFamilies(dependency).has(firstFamily(theme[variable] ?? '')), `${variable}: ${theme[variable]}`)
  }

  const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name))
  const dangling = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name).filter((name) => !declared.has(name))
  assert.deepEqual(dangling, [])
})
