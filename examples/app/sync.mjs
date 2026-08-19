/**
 * Installs this app the way a consumer installs a pmndrs block — with one
 * substitution: every address that names an item built here is redirected at the
 * working tree.
 *
 * That substitution is the whole reason this file exists. `registryDependencies`
 * are absolute by design (`pmndrs/design-system/md3#v0.4.0`), and shadcn resolves
 * a GitHub address before anything else, so installing the local `panel` would
 * still pull `md3` from the released tag — the one item a pull request is most
 * likely to have changed. Redirecting is the local equivalent of a package
 * resolution override, and it belongs to the consumer for the same reason: the
 * published registry stays exactly what it is, addresses and all.
 *
 *   examples/block/registry.json   what pmndrs/docs writes, pinned tag included
 *   ../../registry.json            this repo, unmodified
 *   .registry/                     both, built, with those addresses redirected
 *
 * shadcn takes a relative `.json` path as an item address and resolves it from
 * the process working directory, so `.registry/md3.json` is all a redirect is.
 *
 * `globals.css` is reset from `globals.base.css` first, and is why that file is
 * kept: `shadcn add` recognises its own CSS block by the exact selector string,
 * so a second run over a formatted file appends a duplicate instead. Starting
 * from the pristine `shadcn init` output makes each run produce the same file.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = fileURLToPath(new URL('.', import.meta.url))
const root = path.resolve(app, '../..')
const block = path.join(root, 'examples/block')
const shadcn = path.join(app, 'node_modules/.bin/shadcn')

/** The item this app installs. Everything else arrives as a dependency of it. */
const entry = 'panel'

const build = (cwd) => execFileSync(shadcn, ['build'], { cwd, stdio: 'inherit' })
build(root)
build(block)

/**
 * `shadcn build` writes one file per item plus a `registry.json` index, which is
 * not an item and would fail the schema on the way back in.
 */
function items(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json') && file !== 'registry.json')
    .map((file) => [path.basename(file, '.json'), JSON.parse(readFileSync(path.join(dir, file), 'utf8'))])
}

const built = new Map([...items(path.join(root, 'public/r')), ...items(path.join(block, 'public/r'))])

/**
 * Redirect by item name rather than by repository, so this keeps working when a
 * block gains a sibling: an address is local if we just built something by that
 * name, whatever it is pinned to.
 */
function redirect(dependency) {
  const name = dependency.split('#')[0].split('/').pop()
  return built.has(name) ? `.registry/${name}.json` : dependency
}

const registry = path.join(app, '.registry')
rmSync(registry, { recursive: true, force: true })
mkdirSync(registry, { recursive: true })

for (const [name, item] of built) {
  const local = { ...item, registryDependencies: item.registryDependencies?.map(redirect) }
  writeFileSync(path.join(registry, `${name}.json`), JSON.stringify(local, null, 2) + '\n')
}

copyFileSync(path.join(app, 'src/app/globals.base.css'), path.join(app, 'src/app/globals.css'))

execFileSync(shadcn, ['add', `.registry/${entry}.json`, '--yes', '--overwrite'], { cwd: app, stdio: 'inherit' })
