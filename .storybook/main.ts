import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'

const config = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: '@storybook/react-vite',
  refs: {
    'pmndrs-docs': {
      title: 'pmndrs/docs',
      url: 'https://main--6977e41687a50b30c4349650.chromatic.com/',
      expanded: false,
    },
  },
  async viteFinal(config) {
    return {
      ...config,
      plugins: [...(config.plugins ?? []), tailwindcss()],
    }
  },
} satisfies StorybookConfig

export default config
