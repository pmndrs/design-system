/** Committed distribution outputs must agree with their canonical sources. */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { outputs } from './scripts/build.mjs'

const root = new URL('./', import.meta.url)

test('the build never owns editorial source files', () => {
  const sources = outputs.map(([url]) => url.pathname.replace(root.pathname, ''))
    .filter((path) => path.startsWith('docs/') || path === 'README.md' || path === '.changeset/README.md')
  assert.deepEqual(sources, [])
})

for (const [url, next] of outputs) {
  const path = url.pathname.replace(root.pathname, '')

  // No diff: one of these is a 300-line generated file, and `pnpm run build`
  // shows the change far better than an assertion dump would. A missing file is
  // the same failure as a stale one — say so, rather than throwing ENOENT.
  test(`${path} is current`, () => {
    const current = existsSync(url) ? readFileSync(url, 'utf8') : null
    assert.equal(current, next, `${path} is out of date — run \`pnpm run build\` and commit the result.`)
  })
}
