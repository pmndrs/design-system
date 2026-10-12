import type { Preview } from '@storybook/react-vite'
import { withThemeByClassName } from '@storybook/addon-themes'
import '../registry/v0/globals.css'

const preview = {
  decorators: [
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],
  parameters: {
    layout: 'padded',
    options: {
      storySort: { order: ['Introduction', 'Foundations'] },
    },
  },
} satisfies Preview

export default preview
