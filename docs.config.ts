import foundations from './foundations.json'
import pkg from './package.json'
import registry from './registry.json'
import external from './registry/external.json'
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { themePresets } from './registry/md3-base/presets.ts'
import { catalogEntries, registrySearchCommand } from './scripts/catalog.mjs'
import { v0Link } from './scripts/v0.mjs'
import { RegistryCatalog } from './docs/getting-started/RegistryCatalog'
import { FoundationTable } from './docs/tokens/FoundationTable'

const release = `v${pkg.version}`
const registries = [{ repo: 'pmndrs/design-system', ref: release, items: registry.items }, ...external]
const playgroundUrl = new URL('https://main--695eb517cb602e59b4cc045c.chromatic.com/')
playgroundUrl.searchParams.set('path', '/story/mtb--st-1')
playgroundUrl.searchParams.set('nav', 'false')

function storybookValue(value: unknown) {
  if (typeof value === 'boolean') return `!${value}`
  if (typeof value === 'string' && value.startsWith('#')) return `!hex(${value.slice(1)})`
  return String(value)
}

const { customColors, ...core } = pmndrsMtb
const args = Object.entries(core).map(([key, value]) => `${key}:${storybookValue(value)}`)
for (const [index, color] of customColors.entries()) {
  for (const [key, value] of Object.entries(color)) args.push(`customColors[${index}].${key}:${storybookValue(value)}`)
}
playgroundUrl.searchParams.set('args', args.join(';'))

/** Native MDX components and shared values, loaded by @pmndrs/docs 4.25+. */
export default {
  components: { FoundationTable, RegistryCatalog },
  scope: {
    foundations,
    release,
    v0Url: v0Link,
    playgroundUrl: playgroundUrl.href,
    themePresets: themePresets.map(({ name, ...preset }) => ({ name: `theme-${name}`, ...preset })),
    catalog: catalogEntries(registries),
    catalogSearchCommand: registrySearchCommand(registries),
  },
}
