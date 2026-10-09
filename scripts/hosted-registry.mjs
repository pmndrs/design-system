/**
 * Writes the hosted registry: `registry.json` as static files, one
 * `<name>.json` per item plus the index, the way a shadcn namespace reads them.
 *
 * The docs site serves them at `hostedUrl` (see `.github/workflows/docs.yml`),
 * so a consumer declares the namespace once in `components.json`,
 *
 *   "registries": { "@pmndrs": "https://pmndrs.github.io/design-system/r/{name}.json" }
 *
 * and gets `npx shadcn add @pmndrs/theme`, and the shadcn MCP server can list
 * and install the items. The deploy runs this from `main`, so the hosted files
 * are always the latest merged state; the git tag stays the pinned install
 * address.
 *
 * The per-item format is `shadcn build`'s: it copies each item as it is and
 * inlines every file's `content`, and copies `registry.json` itself as the
 * index. Nothing here is committed: the output is built from the committed
 * `registry.json` at deploy time, so the two cannot disagree.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)

/** Where the docs site serves the hosted registry: `{name}` of a namespace is `<hostedUrl><name>.json`. */
export const hostedUrl = 'https://pmndrs.github.io/design-system/r/'

/** Where `npm run hosted-registry` writes without an argument: shadcn's own default, gitignored. */
export const outDir = new URL('../public/r/', import.meta.url)

const shadcn = fileURLToPath(import.meta.resolve('shadcn'))

/**
 * Writes the registry at `registryUrl` into `dir`, emptied first so an item
 * that is gone does not linger, and returns the file names written.
 *
 * @param {URL} dir
 * @param {URL} [registryUrl]
 */
export function writeHostedRegistry(dir, registryUrl = new URL('registry.json', root)) {
  // A namespace lists its items by fetching the one named `registry`: the index.
  // An item of that name would overwrite it.
  const { items } = JSON.parse(readFileSync(registryUrl, 'utf8'))
  if (items.some(({ name }) => name === 'registry')) {
    throw new Error('No item may be named `registry`: that is the hosted index, `registry.json`.')
  }

  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  // `files[].path` is relative to the repo root, so that is where it runs.
  execFileSync(process.execPath, [shadcn, 'build', fileURLToPath(registryUrl), '--output', fileURLToPath(dir)], {
    cwd: fileURLToPath(root),
    stdio: 'pipe',
  })
  return readdirSync(dir)
}

if (import.meta.main) {
  const dir = process.argv[2] ? pathToFileURL(`${resolve(process.argv[2])}/`) : outDir
  const written = writeHostedRegistry(dir)
  console.log(`built ${written.length} files into ${fileURLToPath(dir)}`)
}
