import type { MtbConfig } from 'material-theme-builder'

/**
 * The pmndrs Material Design 3 seed.
 *
 * The colours every pmndrs site derives from. The shadcn preset carries radius
 * and typography, not colour — moving `source` here is what actually moves the
 * rendered palette.
 *
 * Every value is overridable per deployment through a `THEME_*` env var, so a
 * site can reseed without forking the file.
 *
 * Read from a React Server Component (a Next.js root layout, typically): the
 * non-`NEXT_PUBLIC_` vars below are only substituted on the server.
 *
 * Need colours M3 has no role for — alert levels, a status palette? Extend this
 * rather than editing it, so the next update of this item stays a clean
 * overwrite:
 *
 * ```ts
 * export const myMtb = {
 *   ...pmndrsMtb,
 *   customColors: [{ name: 'note', hex: '#1f6feb', blend: true }],
 * } satisfies MtbConfig
 * ```
 *
 * `blend: true` harmonizes them against the seed above, so they stay yours and
 * still belong to the pmndrs palette. The stylesheet this item imports carries
 * the standard M3 roles only — a custom colour is a name no shipped file can
 * know — so name yours in the plugin, next to that import:
 *
 * ```css
 * @plugin "material-theme-builder/tailwind" {
 *   custom-colors: note;
 * }
 * ```
 *
 * That one line is what makes `bg-note`, `text-on-note`, `bg-note-container` and
 * the eleven `bg-note-300` shades exist. Leave it out and Tailwind emits no rule
 * for any of them — and no error either.
 */
export const pmndrsMtb = {
  /** poimandres slate. */
  source: process.env.THEME_PRIMARY || '#323e48',
  scheme: (process.env.THEME_SCHEME || 'tonalSpot') as MtbConfig['scheme'],
  contrast: Number(process.env.THEME_CONTRAST) || 0,
} satisfies MtbConfig
