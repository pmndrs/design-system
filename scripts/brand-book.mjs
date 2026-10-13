/**
 * The brand book is written once, in `registry/guidelines/brand-book.md`, and
 * published as the docs site's Guidelines page and the `guidelines` item's
 * `Guidelines.md` by `build.mjs`. Both use these release placeholders.
 */
import pkg from '../package.json' with { type: 'json' }
import preset from '../preset.json' with { type: 'json' }
import external from '../registry/external.json' with { type: 'json' }

/**
 * The release is `package.json`'s version, which Changesets bumps and the
 * release workflow tags. The shadcn preset, its code and its style
 * (`base-<style>`, as shadcn names it), is `preset.json`'s.
 */
export const placeholders = {
  release: `v${pkg.version}`,
  docsRef: external.find(({ repo }) => repo === 'pmndrs/docs').ref,
  presetStyle: `base-${preset.values.style}`,
  // Published dependencies of the blocks described in the brand book.
  blocksColourLayer: 'pmndrs/design-system/theme#v0.6.0',
  exampleBlockAddress: 'pmndrs/docs/mdx-prose#v1.0.0',
}

/**
 * `text` with its `{{name}}` placeholders filled from `values`. Throws on an
 * unknown one, naming `where` it was found.
 *
 * @param {string} text
 * @param {string} where
 * @param {Record<string, string>} [values]
 */
export function fill(text, where, values = placeholders) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (!(name in values)) throw new Error(`${where}: unknown placeholder ${match}`)
    return values[name]
  })
}
