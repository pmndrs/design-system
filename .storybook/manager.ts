import { addons } from 'storybook/manager-api'
import externalRegistries from '../registry/external.json'

const supportedComponents = new Set(
  externalRegistries
    .filter(({ repo }) => repo === 'pmndrs/docs')
    .flatMap(({ items }) => items.map(({ name }) => name)),
)

addons.setConfig({
  sidebar: {
    filters: {
      // Composition filters run before refId is added. Local entries use the
      // stories directory declared in main.ts; remote titles match registry names.
      'supported-components': ({ importPath, title }) =>
        importPath.startsWith('./stories/') || supportedComponents.has(title.toLowerCase()),
    },
  },
})
