/**
 * The foundation tokens, written by `build.mjs` through
 * `scripts/foundation-tokens.mjs`: `figma/Foundations.tokens.json`, the values
 * a Figma variable can hold, and `figma/Styles.tokens.json`, the composites
 * built on them. Their source is the foundations pages of the docs, so every
 * value is held against the page that decides it, read through the same
 * `scripts/foundations.mjs` the artifact reads.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { isDeepStrictEqual } from 'node:util'
import registry from './registry.json' with { type: 'json' }
import { outputs as artifactOutputs } from './scripts/artifact.mjs'
import { readFoundations } from './scripts/foundations.mjs'

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

/** The utility of the Shadows page a style is named after: `shadow-sm` is `shadow.sm`. */
const stylePath = (utility) => utility.replace(/-(?=[^-]+$)/, '.')

/**
 * Tokens Studio's shadow shape, held on hand-written cases: every length in
 * px, a missing blur or spread as `0px`, the colour as `rgba()`, and an
 * `inset` layer, or any layer of the inset family, an inner shadow.
 */
test('every shadow of the Shadows page is an effect style, layer for layer', () => {
  const dropShadow = (x, y, blur, spread, color) => ({ x, y, blur, spread, color, type: 'dropShadow' })
  const innerShadow = (x, y, blur, spread, color) => ({ x, y, blur, spread, color, type: 'innerShadow' })
  const pinned = {
    'shadow.2xs': [dropShadow('0px', '1px', '0px', '0px', 'rgba(0, 0, 0, 0.05)')],
    'shadow.sm': [
      dropShadow('0px', '1px', '3px', '0px', 'rgba(0, 0, 0, 0.1)'),
      dropShadow('0px', '1px', '2px', '-1px', 'rgba(0, 0, 0, 0.1)'),
    ],
    'shadow.2xl': [dropShadow('0px', '25px', '50px', '-12px', 'rgba(0, 0, 0, 0.25)')],
    'inset-shadow.2xs': [innerShadow('0px', '1px', '0px', '0px', 'rgba(0, 0, 0, 0.05)')],
    'inset-shadow.sm': [innerShadow('0px', '2px', '4px', '0px', 'rgba(0, 0, 0, 0.05)')],
    'drop-shadow.md': [dropShadow('0px', '3px', '3px', '0px', 'rgba(0, 0, 0, 0.12)')],
  }
  for (const [path, layers] of Object.entries(pinned)) assert.deepEqual(styles.get(path)?.$value, layers, path)

  // And every other row: one style per utility, one layer per colour of its value.
  const { box, inset, drop } = foundations.shadows
  assert.deepEqual(
    [...styles].filter(([, { $type }]) => $type === 'shadow').map(([path, { $value }]) => [path, $value.length]),
    [...box, ...inset, ...drop].map(({ utility, value }) => [stylePath(utility), value.match(/rgb\(/g).length])
  )
})

/**
 * A shadow as `[x, y, blur, spread, colour]` per layer, lengths as numbers of
 * px, so the artifact's CSS (`0 1px rgba(0, 0, 0, 0.05)`, a missing blur or
 * spread meaning 0) and a Tokens Studio style compare as values.
 */
const cssShadow = (css) =>
  css.split(/,\s*(?![^()]*\))/).map((layer) => {
    const color = layer.match(/rgba\([^)]*\)/)[0]
    const lengths = layer.replace(color, '').replace('inset', '').trim().split(/\s+/).map(parseFloat)
    return [...lengths, 0, 0].slice(0, 4).concat(color)
  })
const styleShadow = (layers) => layers.map(({ x, y, blur, spread, color }) => [x, y, blur, spread].map(parseFloat).concat(color))

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
    agree(name, cssShadow(value), styleShadow(styles.get(stylePath(name))?.$value ?? []))
  }

  assert.deepEqual(problems, [])
})

