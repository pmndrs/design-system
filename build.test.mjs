/**
 * `registry.json` is generated but committed, because GitHub-based resolution
 * reads it from the repo — and so are the install refs in the two READMEs. That
 * makes them the one class of file that can be wrong while every input is right:
 * change the seed, the config or the version, skip the rebuild, and nothing else
 * in this repo notices.
 *
 * The comparison runs against `build.mjs`'s own `outputs`, so it is the same
 * strings `npm run build` writes rather than a second opinion about them.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { outputs } from './scripts/build.mjs'

const root = new URL('./', import.meta.url)

for (const [url, next] of outputs) {
  const path = url.pathname.replace(root.pathname, '')

  // No diff: one of these is a 300-line generated file, and `npm run build`
  // shows the change far better than an assertion dump would. A missing file is
  // the same failure as a stale one — say so, rather than throwing ENOENT.
  test(`${path} is current`, () => {
    const current = existsSync(url) ? readFileSync(url, 'utf8') : null
    assert.equal(current, next, `${path} is out of date — run \`npm run build\` and commit the result.`)
  })
}
