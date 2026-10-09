/**
 * The foundations as Figma tokens: the type, spacing, radius, shadow and
 * motion values of the docs pages, read through `readFoundations()`, in the
 * two shapes the two Figma readers take.
 *
 * `foundationVariables()` is the file Figma's native "Import variables" reads:
 * DTCG 2025.10, one mode, one collection. That reader sets the shape. A
 * dimension is imported in px only and a duration in seconds only, so rem and
 * ms values are converted here rather than skipped there.
 *
 * `foundationStyles()` is the file Tokens Studio reads to create the text and
 * effect styles, which Figma's import does not: composites are not variables.
 * Tokens Studio sets that shape, and it is not DTCG 2025.10. It reads a
 * dimension as a string (`12px`), never a `{ value, unit }` object, and a
 * shadow as `x`, `y` and a `type`, never `offsetX`, `offsetY` and `inset`. A
 * spec-shaped styles file would load and apply nothing. The `$type` names are
 * DTCG's, which Tokens Studio maps onto its own.
 */

/** `0.5` as a token name: a DTCG name cannot hold a dot, the separator of an alias path. */
const tokenName = (step) => step.replaceAll('.', '_')

/** A DTCG token, with the Figma pickers it is offered in. */
const token = ($type, $value, scopes) => ({ $type, $value, $extensions: { 'com.figma.scopes': scopes } })

const px = (value) => ({ value, unit: 'px' })

/**
 * The variables file: every foundation value a Figma variable can hold.
 *
 * @param {ReturnType<typeof import('./foundations.mjs').readFoundations>} foundations
 */
export function foundationVariables({ typography, spacing, radius, motion }) {
  const step = (utility) => utility.replace(/^(text|font)-/, '')
  return {
    $extensions: { 'com.figma.modeName': 'Default' },
    font: {
      /** One name, not a stack: Figma refuses an array. */
      family: Object.fromEntries(
        typography.fonts.map(({ utility, family }) => [step(utility), token('fontFamily', family, ['FONT_FAMILY'])])
      ),
      size: Object.fromEntries(
        typography.scale.map(({ utility, pixels }) => [step(utility), token('dimension', px(pixels.fontSize), ['FONT_SIZE'])])
      ),
      /**
       * In pixels, where DTCG would have a multiplier of the font size: Figma
       * binds a number variable on a line height as pixels, and Tokens Studio
       * reads a unitless line height the same way.
       */
      'line-height': Object.fromEntries(
        typography.scale.map(({ utility, pixels }) => [step(utility), token('number', pixels.lineHeight, ['LINE_HEIGHT'])])
      ),
      /**
       * `number`, not `fontWeight`: Figma's import skips a `fontWeight` token
       * without a word. It also drops the `FONT_WEIGHT` scope, kept here for
       * the reader that honours it; in Figma it is set by hand.
       */
      weight: Object.fromEntries(
        typography.weights.map(({ utility, value }) => [step(utility), token('number', value, ['FONT_WEIGHT'])])
      ),
    },
    /**
     * Gaps, and sizes too: the Spacing page's scale drives `w-*`, `h-*` and
     * `size-*` as well as padding and gaps.
     */
    spacing: Object.fromEntries(
      spacing.scale.map(({ step, pixels }) => [tokenName(step), token('dimension', px(pixels), ['GAP', 'WIDTH_HEIGHT'])])
    ),
    /** `--radius-lg` as `radius.lg`: the step, at the preset's base. */
    radius: Object.fromEntries(
      radius.scale.map(({ token: name, pixels }) => [name.replace('--radius-', ''), token('dimension', px(pixels), ['CORNER_RADIUS'])])
    ),
    ...motionVariables(motion),
  }
}

/** `150ms` as `{ value: 0.15, unit: 's' }`: Figma imports a duration in seconds only. */
const seconds = (ms) => ({ value: parseFloat(ms) / 1000, unit: 's' })

/** `cubic-bezier(0.4, 0, 0.2, 1)` as its four numbers; `linear` is the straight curve. */
function curve(css) {
  if (css === 'linear') return [0, 0, 1, 1]
  const points = css.match(/^cubic-bezier\(([^)]+)\)$/)?.[1].split(',').map(Number)
  if (points?.length !== 4 || points.some(Number.isNaN)) throw new Error(`not a cubic-bezier() curve: ${css}`)
  return points
}

/**
 * The Motion page: every `duration-*` step and `ease-*` curve, and the two a
 * transition falls back on as `default`.
 *
 * No Figma picker takes a duration or a curve, so these are offered in none.
 * Figma's import creates the durations, as numbers in seconds, and skips the
 * curves: `cubicBezier` is not a type it reads. They stay for every other DTCG
 * reader, and for whoever builds a prototype transition by hand.
 */
function motionVariables({ defaults, durations, easings }) {
  const fallback = (variable) => defaults.find((row) => row.variable === variable).value
  return {
    duration: Object.fromEntries([
      ...durations.map(({ utility, value }) => [utility.replace('duration-', ''), token('duration', seconds(value), [])]),
      ['default', token('duration', seconds(fallback('--default-transition-duration')), [])],
    ]),
    ease: Object.fromEntries([
      ...easings.map(({ utility, value }) => [utility.replace('ease-', ''), token('cubicBezier', curve(value), [])]),
      ['default', token('cubicBezier', curve(fallback('--default-transition-timing-function')), [])],
    ]),
  }
}

/**
 * `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` as the
 * layers of a Tokens Studio shadow. A missing blur or spread is `0px`, and
 * `inset` makes a layer an inner shadow whatever its family.
 *
 * @param {string} css
 * @param {'dropShadow' | 'innerShadow'} type
 */
function shadowLayers(css, type) {
  return css.split(/,\s*(?![^()]*\))/).map((layer) => {
    const parts = layer.match(/^(inset )?((?:-?[\d.]+(?:px)?\s+)+)rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/)
    if (!parts) throw new Error(`not a shadow layer of the Shadows page: ${layer}`)
    const [, inset, lengths, r, g, b, alpha] = parts
    const [x, y, blur = '0px', spread = '0px'] = lengths.trim().split(/\s+/).map((length) => `${parseFloat(length)}px`)
    return { x, y, blur, spread, color: `rgba(${r}, ${g}, ${b}, ${alpha})`, type: inset ? 'innerShadow' : type }
  })
}

/**
 * The styles file, a Tokens Studio single file: two token sets and the order
 * they load in.
 *
 * `styles` holds the composites: a text style per step of the type scale, in
 * Inter at the normal weight, and an effect style per shadow. A text style
 * names its values by reference, `{font.size.xs}`, and Tokens Studio binds a
 * style to the Figma variable of that name (`font/size/xs`), so a text style
 * follows the variables `foundationVariables()` writes.
 *
 * `foundations` is what those references resolve to inside Tokens Studio,
 * which cannot read the variables file's `{ value, unit }` objects: the same
 * font values, as strings. Shadows have no variable to reference, so their
 * values are written in.
 *
 * @param {ReturnType<typeof import('./foundations.mjs').readFoundations>} foundations
 */
export function foundationStyles({ typography, shadows }) {
  const step = (utility) => utility.replace(/^(text|font)-/, '')
  const plain = ($type, $value) => ({ $type, $value })
  const shadowsOf = (rows, type) =>
    Object.fromEntries(
      rows.map(({ utility, value }) => [utility.slice(utility.lastIndexOf('-') + 1), plain('shadow', shadowLayers(value, type))])
    )

  return {
    foundations: {
      font: {
        family: Object.fromEntries(typography.fonts.map(({ utility, family }) => [step(utility), plain('fontFamily', family)])),
        size: Object.fromEntries(
          typography.scale.map(({ utility, pixels }) => [step(utility), plain('dimension', `${pixels.fontSize}px`)])
        ),
        /** Unitless, which Tokens Studio applies as pixels, as Figma does the variable. */
        'line-height': Object.fromEntries(
          typography.scale.map(({ utility, pixels }) => [step(utility), plain('number', pixels.lineHeight)])
        ),
        weight: Object.fromEntries(typography.weights.map(({ utility, value }) => [step(utility), plain('fontWeight', value)])),
      },
    },
    styles: {
      text: Object.fromEntries(
        typography.scale.map(({ utility }) => [
          step(utility),
          plain('typography', {
            fontFamily: '{font.family.sans}',
            fontSize: `{font.size.${step(utility)}}`,
            fontWeight: '{font.weight.normal}',
            lineHeight: `{font.line-height.${step(utility)}}`,
          }),
        ])
      ),
      shadow: shadowsOf(shadows.box, 'dropShadow'),
      'inset-shadow': shadowsOf(shadows.inset, 'innerShadow'),
      /** `filter: drop-shadow()` has no spread, and draws as a drop shadow effect in Figma. */
      'drop-shadow': shadowsOf(shadows.drop, 'dropShadow'),
    },
    $themes: [],
    $metadata: { tokenSetOrder: ['foundations', 'styles'] },
  }
}
