import type { StorybookConfig } from '@storybook/react-vite'
import externalRegistries from '../registry/external.json' with { type: 'json' }
import { storybookRefs } from '../scripts/storybook.mjs'

const config = {
  stories: ['../stories/**/*.mdx'],
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  refs: storybookRefs(externalRegistries),
} satisfies StorybookConfig

export default config
