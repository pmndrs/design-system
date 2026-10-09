/**
 * The foundations values, read off the docs pages that decide them:
 * Typography, Spacing, Radius, Shadows and Motion. Those pages are the source of
 * truth, so every generated file that carries a foundation value reads it
 * here rather than restating it.
 *
 * A page is cut at its `##` headings, and a value is a cell of the first
 * markdown table under the heading that names it. A missing section or an
 * empty table throws, naming the page: a foundation family with nothing in it
 * would otherwise ship as an empty file.
 */
import { readFileSync } from 'node:fs'

/** Where the docs pages live: `<dir>/introduction.mdx` under it. */
const defaultDocsDir = new URL('../docs/', import.meta.url)

/**
 * A docs page, `<docsDir>/<dir>/introduction.mdx`, cut at its `##` headings.
 *
 * @param {string} dir
 * @param {URL} [docsDir]
 */
export function readPage(dir, docsDir = defaultDocsDir) {
  const text = readFileSync(new URL(`${dir}/introduction.mdx`, docsDir), 'utf8')
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

/**
 * The `## heading` section of `page`. Throws when the page has none.
 *
 * @param {ReturnType<typeof readPage>} page
 * @param {string} heading
 */
export function section(page, heading) {
  const found = page.sections.find((entry) => entry.heading === heading)
  if (!found) throw new Error(`docs/${page.dir} has no "## ${heading}" section`)
  return found
}

/**
 * The rows of the first markdown table in `markdown`, header and separator
 * dropped, each cell unwrapped from its backticks. Throws rather than return
 * nothing: an empty table here is a token family with nothing in it.
 *
 * @param {string} markdown
 * @returns {string[][]}
 */
export function tableRows(markdown) {
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

/** The rows of the table under `## heading` of `page`. */
const rowsOf = (page, heading) => tableRows(section(page, heading).body)

/** `12` of `… (12px)`, the pixel note a cell carries after its value. */
const pixelNote = (cell) => parseFloat(cell.match(/\((\d+(?:\.\d+)?)px\)/)[1])

/** The value a cell carries in backticks before its pixel note: `0.75rem` of `` `0.75rem` (12px) ``. */
const quoted = (cell) => cell.match(/^`([^`]+)`/)[1]

/**
 * The Typography page: the two font families, the `text-*` type scale, each
 * step's size and line height as Tailwind writes them, with their pixels at a
 * 16px root, and the `font-*` weights, each a number.
 */
function typography(page) {
  return {
    fonts: rowsOf(page, 'Font family').map(([role, family, utility, variable]) => ({ role, family, utility, variable })),
    weights: rowsOf(page, 'Font weight').map(([utility, variable, value]) => ({ utility, variable, value: Number(value) })),
    scale: rowsOf(page, 'Type scale').map(([utility, size, leading]) => ({
      utility,
      fontSize: quoted(size),
      lineHeight: quoted(leading),
      pixels: { fontSize: pixelNote(size), lineHeight: pixelNote(leading) },
    })),
  }
}

/** The Spacing page: the base unit, and the common steps with their pixels at a 16px root. */
function spacing(page) {
  return {
    base: rowsOf(page, 'Base unit')[0][1],
    scale: rowsOf(page, 'Scale').map(([step, value, pixels]) => ({ step, value, pixels: parseFloat(pixels) })),
  }
}

/**
 * The Radius page: `--radius`, from the page's CSS block, and the scale, each
 * step's formula (`calc(var(--radius) * 0.6)`) and its value at the base.
 */
function radius(page) {
  return {
    base: page.text.match(/^\s*--radius:\s*([^;]+);/m)[1],
    scale: rowsOf(page, 'Scale').map(([token, utility, formula, value, pixels]) => ({
      token,
      utility,
      formula,
      value,
      pixels: parseFloat(pixels),
    })),
  }
}

/** The Shadows page: its three families, each a list of utility, variable and value. */
function shadows(page) {
  const rows = (heading) => rowsOf(page, heading).map(([utility, variable, value]) => ({ utility, variable, value }))
  return { box: rows('Box shadow'), inset: rows('Inset shadow'), drop: rows('Drop shadow') }
}

/**
 * The Motion page: the two variables a transition falls back on, the
 * `duration-*` steps and the `ease-*` curves. `ease-linear` has no theme
 * variable, so its `variable` is `null`.
 */
function motion(page) {
  return {
    defaults: rowsOf(page, 'Defaults').map(([variable, value]) => ({ variable, value })),
    durations: rowsOf(page, 'Duration').map(([utility, value]) => ({ utility, value })),
    easings: rowsOf(page, 'Easing').map(([utility, variable, value]) => ({
      utility,
      variable: variable.startsWith('--') ? variable : null,
      value,
    })),
  }
}

/**
 * The foundations values, one entry per family, read off the docs pages under
 * `docsDir` (the repo's `docs/` by default).
 *
 * @param {URL} [docsDir]
 */
export function readFoundations(docsDir = defaultDocsDir) {
  const page = (dir) => readPage(dir, docsDir)
  return {
    typography: typography(page('typography')),
    spacing: spacing(page('spacing')),
    radius: radius(page('radius')),
    shadows: shadows(page('shadows')),
    motion: motion(page('motion')),
  }
}
