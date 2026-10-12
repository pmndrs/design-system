import type { Meta, StoryObj } from '@storybook/react-vite'

const roles = ['primary', 'secondary', 'tertiary', 'lime', 'teal', 'cyan', 'purple', 'red', 'orange', 'yellow', 'note', 'tip', 'important', 'warning', 'caution']

function Palette() {
  return (
    <main className="bg-background text-foreground p-6">
      <h1 className="mb-2 text-3xl font-semibold">Poimandres colors</h1>
      <p className="mb-6 text-muted-foreground">
        The generated DS palette. Switch the theme toolbar to preview light and dark.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div key={role} className="overflow-hidden rounded-lg border border-border">
            <div
              className="p-4"
              style={{
                backgroundColor: `var(--md-sys-color-${role})`,
                color: `var(--md-sys-color-on-${role})`,
              }}
            >
              <code>{role} / on-{role}</code>
            </div>
            <div
              className="p-4"
              style={{
                backgroundColor: `var(--md-sys-color-${role}-container)`,
                color: `var(--md-sys-color-on-${role}-container)`,
              }}
            >
              <code>{role}-container / on-{role}-container</code>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

const meta = {
  title: 'Foundations/Colors',
  component: Palette,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Uses registry/v0/globals.css, generated from the same palette as the theme registry item. No duplicate color values.',
      },
    },
  },
} satisfies Meta<typeof Palette>

export default meta

/**
 * The DS role pairs under the toolbar's selected light or dark scheme.
 */
export const Colors = {} satisfies StoryObj<typeof meta>
