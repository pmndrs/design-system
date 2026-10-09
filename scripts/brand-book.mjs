/**
 * The brand book is written once, in `artifact/README.md`, and read in three
 * places: the Claude Design artifact (`artifact.mjs`), the Guidelines page of
 * the docs site and the `Guidelines.md` of the `guidelines` item (both
 * `build.mjs`). What those share lives here, so the three cannot drift:
 *
 *   placeholders, fill          the `{{name}}` values, and how they are filled
 *   stripArtifactOnly           the text as the site reads it
 *   unmarkArtifactOnly          the text as the artifact reads it
 *
 * The placeholders here are the ones every reader can fill the same way, from
 * `package.json`, `preset.json`, `node_modules`, `registry/external.json` and
 * the pins of `artifact.notes.json`. The artifact adds its own (the source
 * commit, the font package version), which only artifact-only passages use:
 * a build that met one would fail on it, rather than name a commit in a
 * generated file that would then go stale on every commit.
 */
import { readFileSync } from 'node:fs'
import pkg from '../package.json' with { type: 'json' }
import preset from '../preset.json' with { type: 'json' }
import external from '../registry/external.json' with { type: 'json' }
import notes from './artifact.notes.json' with { type: 'json' }

/** `x.y.z` of an installed package. */
export const installedVersion = (name) =>
  JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8')).version

/**
 * The release is `package.json`'s version, which Changesets bumps and the
 * release workflow tags. The shadcn preset, its code and its style
 * (`base-<style>`, as shadcn names it), is `preset.json`'s.
 */
export const placeholders = {
  release: `v${pkg.version}`,
  docsRef: external.find(({ repo }) => repo === 'pmndrs/docs').ref,
  mtbVersion: installedVersion('material-theme-builder'),
  presetCode: preset.code,
  presetStyle: `base-${preset.values.style}`,
  ...notes.pins,
}

/**
 * `text` with its `{{name}}` placeholders filled from `values`. Throws on an
 * unknown one, naming `where` it was found.
 */
export function fill(text, where, values = placeholders) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (!(name in values)) throw new Error(`${where}: unknown placeholder ${match}`)
    return values[name]
  })
}

/**
 * A passage that only makes sense inside the artifact sits between
 * `<!-- artifact-only -->` and `<!-- /artifact-only -->`: on lines of their
 * own around whole paragraphs or sections, or inline around a few words.
 */
const artifactOnly = /<!-- artifact-only -->[\s\S]*?<!-- \/artifact-only -->/g

/**
 * The text for the docs site: every artifact-only passage removed, and the
 * blank lines a removed paragraph leaves behind collapsed into one.
 */
export function stripArtifactOnly(text) {
  return text.replace(artifactOnly, '').replace(/\n{3,}/g, '\n\n')
}

/**
 * The text for the artifact: every passage kept, only the markers removed.
 * A marker on a line of its own takes its line with it.
 */
export function unmarkArtifactOnly(text) {
  return text.replace(/^<!-- \/?artifact-only -->\n/gm, '').replace(/<!-- \/?artifact-only -->/g, '')
}
