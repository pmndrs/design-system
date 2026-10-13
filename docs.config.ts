import foundations from './foundations.json' with { type: 'json' }
import pkg from './package.json' with { type: 'json' }
import registry from './registry.json' with { type: 'json' }
import external from './registry/external.json' with { type: 'json' }
import { pmndrsMtb } from './registry/md3-base/md3.ts'
import { themePresets } from './registry/md3-base/presets.ts'
import { catalogEntries, registrySearchCommand } from './scripts/catalog.mjs'
import { v0Link } from './scripts/v0.mjs'

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

/** The native Code component needs each runner for our shadcn commands. */
function shadcnCommands(args: string) {
  return {
    pnpm: `pnpm dlx shadcn@latest ${args}`,
    npm: `npx shadcn@latest ${args}`,
    yarn: `yarn dlx shadcn@latest ${args}`,
    bun: `bunx --bun shadcn@latest ${args}`,
  }
}

// The catalog owns its pinned search targets; only the known runner prefix changes.
const searchArguments = registrySearchCommand(registries).slice('npx shadcn@latest '.length)

/** Shared values for authored Markdown tables, addressed by stable names. */
export default {
  scope: {
    foundations,
    fonts: Object.fromEntries(foundations.typography.fonts.map((row) => [row.utility, row])),
    typeScale: Object.fromEntries(foundations.typography.scale.map((row) => [row.utility, row])),
    fontWeights: Object.fromEntries(foundations.typography.weights.map((row) => [row.utility, row])),
    spacing: Object.fromEntries(foundations.spacing.scale.map((row) => [row.step, row])),
    radii: Object.fromEntries(foundations.radius.scale.map((row) => [row.token, row])),
    shadows: Object.fromEntries(Object.values(foundations.shadows).flat().map((row) => [row.utility, row])),
    transitions: Object.fromEntries(foundations.motion.defaults.map((row) => [row.variable, row])),
    durations: Object.fromEntries(foundations.motion.durations.map((row) => [row.utility, row])),
    easings: Object.fromEntries(foundations.motion.easings.map((row) => [row.utility, row])),
    release,
    v0Url: v0Link,
    playgroundUrl: playgroundUrl.href,
    themePresets: themePresets.map(({ name, ...preset }) => ({ name: `theme-${name}`, ...preset })),
    catalog: Object.fromEntries(registries.flatMap((registry) =>
      catalogEntries([registry]).map((entry) => [`${registry.repo}/${entry.name}`, entry]),
    )),
    installCommands: Object.fromEntries(['logo', 'theme', 'figma-tokens', 'md3-base'].map((item) =>
      [item, shadcnCommands(`add pmndrs/design-system/${item}#${release}`)],
    )),
    catalogSearchCommands: shadcnCommands(searchArguments),
  },
}
