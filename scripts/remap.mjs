/**
 * The shadcn remap: `material-theme-builder/shadcn.css`, which points every
 * shadcn variable at an MD3 role (`--card: var(--md-sys-color-surface-container-low)`).
 * `md3-base` imports it as the package ships it, and everything else that
 * needs the pairs reads them here, so there is one reading of that file: the
 * `preset`'s Tailwind colours, the `v0` stylesheet, the artifact's colour
 * tokens and the tests.
 */
import { readFileSync } from 'node:fs'

/**
 * Every shadcn variable the remap sets and the MD3 role it points at, in the
 * stylesheet's order: `{ name: '--card', role: '--md-sys-color-surface-container-low' }`.
 *
 * Read from its one `:root:root, .dark.dark` block; throws if the package ever
 * ships another shape, rather than return a partial remap.
 */
export function readRemap() {
  const css = readFileSync(new URL(import.meta.resolve('material-theme-builder/shadcn.css')), 'utf8')
  const body = css.match(/:root:root,\s*\.dark\.dark\s*\{([^}]*)\}/)?.[1]
  if (!body) throw new Error('material-theme-builder/shadcn.css no longer has its `:root:root, .dark.dark` block')
  const pairs = [...body.matchAll(/(--[\w-]+)\s*:\s*var\((--md-sys-color-[\w-]+)\)/g)].map(([, name, role]) => ({ name, role }))
  if (!pairs.length) throw new Error('material-theme-builder/shadcn.css sets no shadcn variable')
  return pairs
}

/**
 * The `@theme inline` entry shadcn derives from a colour variable, for each
 * one the remap sets: `['--color-card', 'var(--card)']`, which is what makes
 * `bg-card` and `border-border` exist.
 *
 * @param {ReturnType<typeof readRemap>} remap
 * @returns {[string, string][]}
 */
export const tailwindColors = (remap) => remap.map(({ name }) => [`--color-${name.slice(2)}`, `var(${name})`])
