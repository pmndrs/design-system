/**
 * Font family registration read from the installed packages.
 */
import { readFileSync } from 'node:fs'

/**
 * Whether the stylesheet of a Fontsource package registers, by `@font-face`,
 * the first family of a `font-family` value: `Inter Variable` of
 * `'Inter Variable', sans-serif`. A family it does not register renders only
 * where the font happens to be installed locally, and in the fallback
 * everywhere else.
 *
 * @param {string} dependency
 * @param {string} fontFamily
 */
export function registersFamily(dependency, fontFamily) {
  const css = readFileSync(new URL(import.meta.resolve(dependency)), 'utf8')
  const registered = new Set([...css.matchAll(/font-family:\s*'([^']+)'/g)].map(([, family]) => family))
  return registered.has(fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, ''))
}
