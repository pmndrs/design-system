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
