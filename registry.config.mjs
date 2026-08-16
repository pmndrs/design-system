/**
 * The authored half of the registry. `registry.json` is generated from this by
 * `npm run build` and should never be edited by hand.
 *
 * The split exists because the palette is 252 generated `--md-ref-*` and
 * `--md-sys-*` declarations, and mixing them into the file people edit made
 * both halves worse: the real config was buried, and the generated half was one
 * `git diff` away from being hand-patched out of sync with the seed.
 *
 * So: everything here is written by a person, `docs` fields live as markdown in
 * `registry/<item>/docs.md`, and the palette is computed at build time from
 * `registry/md3-base/md3.ts`.
 */

/** Refs are not inherited, so a cross-item dependency carries its own. */
export const version = 'v0.3.0'

export const registry = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'pmndrs',
  homepage: 'https://github.com/pmndrs/design-system',
}

/**
 * shadcn's colour variables, pointed at MD3 roles.
 *
 * The combined `:root, .dark` selector is deliberate: it re-declares these in
 * the dark context so they re-substitute, instead of staying fixed at whatever
 * the MD3 role resolved to under `:root`.
 */
const shadcnRemap = {
  '--background': 'var(--md-sys-color-surface)',
  '--foreground': 'var(--md-sys-color-on-surface)',
  '--card': 'var(--md-sys-color-surface-container-low)',
  '--card-foreground': 'var(--md-sys-color-on-surface)',
  '--popover': 'var(--md-sys-color-surface-container-high)',
  '--popover-foreground': 'var(--md-sys-color-on-surface)',
  '--primary': 'var(--md-sys-color-primary)',
  '--primary-foreground': 'var(--md-sys-color-on-primary)',
  '--secondary': 'var(--md-sys-color-secondary-container)',
  '--secondary-foreground': 'var(--md-sys-color-on-secondary-container)',
  '--muted': 'var(--md-sys-color-surface-container-highest)',
  '--muted-foreground': 'var(--md-sys-color-on-surface-variant)',
  '--accent': 'var(--md-sys-color-secondary-container)',
  '--accent-foreground': 'var(--md-sys-color-on-secondary-container)',
  '--destructive': 'var(--md-sys-color-error)',
  '--border': 'var(--md-sys-color-outline-variant)',
  '--input': 'var(--md-sys-color-outline)',
  '--ring': 'var(--md-sys-color-primary)',
  '--chart-1': 'var(--md-sys-color-primary-fixed)',
  '--chart-2': 'var(--md-sys-color-secondary-fixed)',
  '--chart-3': 'var(--md-sys-color-tertiary-fixed)',
  '--chart-4': 'var(--md-sys-color-primary-fixed-dim)',
  '--chart-5': 'var(--md-sys-color-secondary-fixed-dim)',
  '--sidebar': 'var(--md-sys-color-surface-container-low)',
  '--sidebar-foreground': 'var(--md-sys-color-on-surface)',
  '--sidebar-primary': 'var(--md-sys-color-primary)',
  '--sidebar-primary-foreground': 'var(--md-sys-color-on-primary)',
  '--sidebar-accent': 'var(--md-sys-color-secondary-container)',
  '--sidebar-accent-foreground': 'var(--md-sys-color-on-secondary-container)',
  '--sidebar-border': 'var(--md-sys-color-outline-variant)',
  '--sidebar-ring': 'var(--md-sys-color-primary)',
}

/**
 * `docs` comes from `registry/<name>/docs.md`, and `palette: true` means the
 * build fills `css` with the baked `:root` / `.dark` blocks.
 */
export const items = [
  {
    name: 'md3-base',
    type: 'registry:lib',
    title: 'MD3 plumbing',
    description:
      "The MD3 colour layer without any colours: the package's Tailwind @theme mapping, the shadcn remap, and the pmndrs seed. Install this only if you compute the palette yourself — otherwise install `md3`, which supplies one.",
    author: 'pmndrs',
    dependencies: ['material-theme-builder@^3.2.0'],
    files: [{ path: 'registry/md3-base/md3.ts', type: 'registry:lib' }],
    css: {
      "@import 'material-theme-builder/tailwind.css'": {},
      ':root, .dark': shadcnRemap,
    },
  },
  {
    name: 'md3',
    type: 'registry:lib',
    title: 'MD3 colours',
    description:
      'The pmndrs Material Design 3 colour layer. Additive to the stock shadcn tokens — blocks use `bg-primary` by default and reach for `bg-surface-dim` only where shadcn has no equivalent. Nothing to mount.',
    author: 'pmndrs',
    registryDependencies: [`pmndrs/design-system/md3-base#${version}`],
    palette: true,
  },
]
