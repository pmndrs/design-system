/**
 * `registry.json` is generated, so most of it is already pinned: `check-build`
 * compares the output to what is committed, which fixes anything that is a pure
 * function of the inputs. Asserting those here would only restate the build.
 *
 * What `check-build` cannot catch is a bad *input*. Mistype a variable in the
 * shadcn remap, add a `cssVars` block, point a dependency at an item that does
 * not exist — rebuild, and the output is faithfully current and wrong. These
 * assert the coherence the generator never checks.
 *
 * Schema and `files[].path` existence belong to `shadcn registry validate`,
 * which covers both.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import registry from './registry.json' with { type: 'json' }

/** Every `--name: value` pair under an item's `css`, at any nesting depth. */
function declarations(css, found = []) {
  for (const [key, value] of Object.entries(css ?? {})) {
    if (typeof value === 'object') declarations(value, found)
    else if (key.startsWith('--')) found.push([key, value])
  }
  return found
}

const declared = registry.items.flatMap((item) => declarations(item.css))
const names = new Set(declared.map(([name]) => name))

/**
 * Registry-wide rather than per item, deliberately: `md3-base` is the layer
 * without colours, so its remap points at `--md-sys-color-*` that `md3` supplies
 * — or that a runtime `<Mtb>` injects. Only together do the references close.
 *
 * A dangling one is silent everywhere else. CSS drops the declaration, the
 * element keeps whatever it inherited, and the page renders looking plausible.
 */
test('every var() reference resolves to a variable the registry declares', () => {
  const dangling = declared.flatMap(([name, value]) =>
    [...value.matchAll(/var\(\s*(--[\w-]+)/g)]
      .map(([, reference]) => reference)
      .filter((reference) => !names.has(reference))
      .map((reference) => `${name} references ${reference}, which nothing declares`)
  )

  assert.deepEqual(dangling, [])
})

/**
 * shadcn derives an `@theme inline` entry from every `cssVars` it is handed, and
 * builds the reference by prefixing `--` — so an already-prefixed MD3 name lands
 * as `var(----md-ref-palette-primary-40)`, alongside 252 junk Tailwind theme
 * names. The palette belongs in `css`; this keeps it there.
 */
test('no item declares cssVars', () => {
  const offenders = registry.items.filter((item) => item.cssVars).map((item) => item.name)

  assert.deepEqual(offenders, [])
})

/**
 * A ref is not inherited, so a cross-item dependency carries its own address.
 * The version half is derived from package.json at build time; the item name is
 * hand-written, and resolves to a 404 at install time if it drifts.
 */
test('registryDependencies on this registry name items it defines', () => {
  const self = new URL(registry.homepage).pathname.slice(1)
  const own = new Set(registry.items.map((item) => item.name))

  const dangling = registry.items.flatMap((item) =>
    (item.registryDependencies ?? [])
      .filter((dependency) => dependency.startsWith(`${self}/`))
      .map((dependency) => dependency.slice(self.length + 1).split('#')[0])
      .filter((name) => !own.has(name))
  )

  assert.deepEqual(dangling, [])
})
