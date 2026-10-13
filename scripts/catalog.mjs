/**
 * The registry catalog: every shadcn item pmndrs publishes, whichever repo it
 * lives in, listed on the getting-started page, `docs/getting-started/introduction.mdx`.
 *
 * No index of them existed — each repo's `registry.json` knows its own items
 * and nothing else — so this one is assembled from two sources:
 *
 *   registry.json              this repo's items, as `build.mjs` builds them
 *   registry/external.json     a snapshot of the other repos' items
 *
 * The catalog links each item to its source and shows its install address:
 * local items use the hosted `@pmndrs` namespace, other repos use a pinned
 * GitHub address. Short descriptions explain each item; dependencies and files stay in the
 * repo that owns them.
 *
 * The snapshot is committed and holds item names, types and descriptions,
 * so `pnpm run build` and `pnpm test` stay offline and deterministic: a test that
 * fetched would fail on a plane, and would turn red the moment another repo
 * pushed, on a branch that changed nothing. Refreshing is an explicit step
 * instead:
 *
 *   pnpm run refresh-catalog
 *
 * which runs this file to re-fetch each listed registry at its ref, then
 * rebuilds the registry.
 * To list another registry, add `{ "repo": "owner/name", "ref": "…" }`
 * to `registry/external.json` and run the same command.
 *
 * The documentation config supplies these entries to the RegistryCatalog
 * React component. The authored page is never rewritten.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { hostedUrl } from './hosted-registry.url.ts'

/** The committed snapshot of the other repos' registries. */
export const externalUrl = new URL('../registry/external.json', import.meta.url)

/** The part of an item the catalog shows. */
function summarize({ name, type, description }) {
  return { name, type, description }
}

/** Short catalog copy; full install instructions stay in each item's docs. */
const catalogDescriptions = {
  'md3-base': 'MD3 colour plumbing and seeds for computing your own palette.',
  palette: 'The light and dark palettes as plain CSS for any framework.',
  'preset-vue': 'Initialise shadcn-vue with the pmndrs palette, fonts and radius.',
  'font-mono': 'Inconsolata for code and monospace text.',
  theme: 'The default pmndrs palette, MD3 plumbing and mono font.',
  preset: 'Initialise shadcn with pmndrs colours, fonts, radius and icons.',
  logo: 'Static and animated pmndrs logos as SVG files.',
  'figma-tokens': 'Colour and foundation tokens for Figma and Tokens Studio.',
  v0: 'The pmndrs theme as CSS for Open in v0.',
}

function descriptionCell(repo, { name, description = '' }) {
  const brief = repo === 'pmndrs/design-system' && catalogDescriptions[name]
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0]
  return (brief || firstSentence).replace(/\s+/g, ' ').trim()
}

/**
 * Where an item's source lives: its folder, `registry/<name>/`, on GitHub at
 * the ref to install it from. Every pmndrs registry keeps its items that way —
 * by name rather than by `files[].path`, since an item can have no files at
 * all (`theme` is CSS and docs only), and the folder is where its docs sit.
 *
 * @param {string} repo
 * @param {string} ref
 * @param {string} name
 * @returns {string}
 */
export function itemUrl(repo, ref, name) {
  if (repo === 'pmndrs/design-system') return `${hostedUrl}${name}.json`
  return `https://github.com/${repo}/tree/${ref}/registry/${name}`
}

/**
 * Catalog entries with a source link, short description and install address.
 *
 * @param {{ repo: string, ref: string, items: { name: string, type: string, description?: string }[] }[]} registries
 *   `repo` is the GitHub `owner/name` the CLI resolves, `ref` the tag or branch
 *   to install its items from.
 */
export function catalogEntries(registries) {
  return registries.flatMap(({ repo, ref, items }) =>
    items.map((entry) => {
      const { name } = entry
      const hosted = repo === 'pmndrs/design-system'
      return {
        name,
        href: itemUrl(repo, ref, name),
        description: descriptionCell(repo, entry),
        address: hosted ? `@pmndrs/${name}` : `${repo}/${name}#${ref}`,
      }
    }),
  )
}

/**
 * Search every registry at its specified ref, so returned install addresses stay pinned.
 *
 * @param {{ repo: string, ref: string }[]} registries - Registries to search in order.
 */
export function registrySearchCommand(registries) {
  const addresses = registries.map(({ repo, ref }) => `${repo}#${ref}`).join(' ')
  return `npx shadcn@latest search ${addresses}`
}

/**
 * Re-fetches every registry `registry/external.json` lists, at its ref, from
 * raw GitHub — the same file the shadcn CLI resolves an address against.
 */
async function refreshExternal() {
  const registries = JSON.parse(readFileSync(externalUrl, 'utf8'))

  const refreshed = []
  for (const registry of registries) {
    const { repo, ref } = registry
    const url = `https://raw.githubusercontent.com/${repo}/${ref}/registry.json`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)

    const { items } = await response.json()
    refreshed.push({ ...registry, items: items.map(summarize) })
    console.log(`✔ ${repo}#${ref}: ${items.map((item) => item.name).join(', ')}`)
  }

  writeFileSync(externalUrl, JSON.stringify(refreshed, null, 2) + '\n')
}

if (import.meta.main) {
  await refreshExternal()
}
