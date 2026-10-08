/**
 * Prints one version's section of `CHANGELOG.md` — the notes of its GitHub
 * release.
 *
 *   node scripts/release-notes.mjs 0.5.0
 *
 * The package is private, so changesets/action never creates GitHub releases:
 * it gates them on an npm publish that never happens. The `release` job creates
 * them itself, and changesets has already written the notes — a `## <version>`
 * section per release. This hands that section over, without its heading: the
 * release carries the version as its title already.
 *
 * Exits non-zero when the version has no section, so a release is never created
 * with empty notes.
 */
import { readFileSync } from 'node:fs'

/**
 * The body of `## <version>` in a changesets changelog — everything up to the
 * next `## ` heading or the end of the file, trimmed of the blank lines around
 * it. `undefined` when the changelog has no such section.
 *
 * @param {string} changelog the contents of `CHANGELOG.md`
 * @param {string} version a bare version, `0.5.0` — not the `v0.5.0` tag
 * @returns {string | undefined}
 */
export function releaseNotes(changelog, version) {
  const lines = changelog.split('\n')

  const start = lines.indexOf(`## ${version}`)
  if (start === -1) return undefined

  let end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
  if (end === -1) end = lines.length

  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
}

if (import.meta.main) {
  const version = process.argv[2]
  if (!version) {
    console.error('usage: node scripts/release-notes.mjs <version>')
    process.exit(1)
  }

  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
  const notes = releaseNotes(changelog, version)
  if (notes === undefined) {
    console.error(`CHANGELOG.md has no section for ${version}`)
    process.exit(1)
  }

  console.log(notes)
}
