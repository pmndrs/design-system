/**
 * The foundations pages of the docs are the source of the type, spacing,
 * radius, shadow and motion values: the artifact reads them through
 * `scripts/foundations.mjs`, and so will the Figma foundation tokens. These
 * hold the values it returns against what they claim to be: Tailwind v4's own
 * defaults where a page says it inherits them, and the pixel column of a
 * table against its rem column.
 */
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { readFoundations } from './scripts/foundations.mjs'

const foundations = readFoundations()

/** Tailwind's `@theme default` variables, as `--name` to value, whitespace collapsed. */
const themeCss = readFileSync(createRequire(import.meta.url).resolve('tailwindcss/theme.css'), 'utf8')
const tailwind = Object.fromEntries(
  [...themeCss.slice(0, themeCss.indexOf('\n}\n')).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => [
    name,
    value.replace(/\s+/g, ' ').trim(),
  ])
)

/** `0.75rem` at the browser's default 16px root. */
const pixels = (rem) => parseFloat(rem) * 16

test('the type scale is Tailwind v4 defaults, in pixels as in rem', () => {
  const { scale } = foundations.typography
  assert.deepEqual(
    scale.map(({ utility }) => utility),
    ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'].map((step) => `text-${step}`)
  )
  for (const { utility, fontSize, lineHeight, pixels: px } of scale) {
    assert.equal(fontSize, tailwind[`--${utility}`], utility)
    assert.equal(lineHeight, tailwind[`--${utility}--line-height`], utility)
    assert.equal(px.fontSize, pixels(fontSize), utility)
  }
  assert.deepEqual(scale.find(({ utility }) => utility === 'text-xs').pixels, { fontSize: 12, lineHeight: 16 })
  assert.deepEqual(scale.find(({ utility }) => utility === 'text-5xl').pixels, { fontSize: 48, lineHeight: 48 })
})

test('the font families are Inter on --font-sans and Inconsolata on --font-mono', () => {
  assert.deepEqual(
    foundations.typography.fonts.map(({ family, variable, utility }) => ({ family, variable, utility })),
    [
      { family: 'Inter', variable: '--font-sans', utility: 'font-sans' },
      { family: 'Inconsolata', variable: '--font-mono', utility: 'font-mono' },
    ]
  )
})

test('the spacing scale is Tailwind v4 defaults: multiples of its base, in pixels as in rem', () => {
  const { base, scale } = foundations.spacing
  assert.equal(base, tailwind['--spacing'])
  assert.deepEqual(scale.slice(0, 3), [
    { step: '0', value: '0', pixels: 0 },
    { step: 'px', value: '1px', pixels: 1 },
    { step: '0.5', value: '0.125rem', pixels: 2 },
  ])
  for (const { step, value, pixels: px } of scale.filter(({ step }) => /^[\d.]+$/.test(step) && step !== '0')) {
    assert.equal(parseFloat(value), Number(step) * parseFloat(base), `spacing ${step}`)
    assert.equal(px, pixels(value), `spacing ${step}`)
  }
})

test('the radius scale is the preset base times a factor, but xs, which is Tailwind v4 default', () => {
  const { base, scale } = foundations.radius
  assert.equal(base, '0.625rem')
  assert.equal(scale.find(({ token }) => token === '--radius-xs').value, tailwind['--radius-xs'])
  assert.deepEqual(scale.find(({ token }) => token === '--radius-lg'), {
    token: '--radius-lg',
    utility: 'rounded-lg',
    formula: 'var(--radius)',
    value: '0.625rem',
    pixels: 10,
  })
  for (const { token, formula, value, pixels: px } of scale) {
    const factor = formula.match(/^calc\(var\(--radius\) \* ([\d.]+)\)$/)?.[1]
    if (factor) assert.equal(parseFloat(value), Number(factor) * parseFloat(base), token)
    assert.equal(px, pixels(value), token)
  }
})

test('the box, inset and drop shadows are Tailwind v4 defaults', () => {
  const { box, inset, drop } = foundations.shadows
  assert.deepEqual(
    [box, inset, drop].map((rows) => rows.length),
    [7, 3, 6]
  )
  for (const { utility, variable, value } of [...box, ...inset, ...drop]) {
    assert.equal(variable, `--${utility}`)
    assert.equal(value, tailwind[variable], utility)
  }
})

test('the transition defaults and the ease curves are Tailwind v4 defaults', () => {
  const { defaults, easings } = foundations.motion
  assert.deepEqual(defaults, [
    { variable: '--default-transition-duration', value: tailwind['--default-transition-duration'] },
    { variable: '--default-transition-timing-function', value: tailwind['--default-transition-timing-function'] },
  ])
  assert.deepEqual(easings, [
    { utility: 'ease-linear', variable: null, value: 'linear' },
    { utility: 'ease-in', variable: '--ease-in', value: tailwind['--ease-in'] },
    { utility: 'ease-out', variable: '--ease-out', value: tailwind['--ease-out'] },
    { utility: 'ease-in-out', variable: '--ease-in-out', value: tailwind['--ease-in-out'] },
  ])
})

test('the duration scale is its utilities in milliseconds, the default among them', () => {
  const { defaults, durations } = foundations.motion
  assert.deepEqual(
    durations.map(({ utility, value }) => [utility, value]),
    [0, 75, 100, 150, 200, 300, 500, 700, 1000].map((ms) => [`duration-${ms}`, `${ms}ms`])
  )
  const fallback = defaults.find(({ variable }) => variable === '--default-transition-duration').value
  assert.ok(durations.some(({ value }) => value === fallback), `no step is the default, ${fallback}`)
})

test('a foundations page without the section or table it should have is an error naming it', () => {
  const docs = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'foundations-'))}/`)
  try {
    cpSync(new URL('./docs/', import.meta.url), docs, { recursive: true })
    const spacing = new URL('spacing/introduction.mdx', docs)
    writeFileSync(spacing, readFileSync(spacing, 'utf8').replace('## Scale', '## Steps'))
    assert.throws(() => readFoundations(docs), /docs\/spacing has no "## Scale" section/)
  } finally {
    rmSync(docs, { recursive: true, force: true })
  }
})
