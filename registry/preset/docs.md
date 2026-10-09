Starts a project that already looks like pmndrs: `npx shadcn@latest init` with this item's URL configures the poimandres preset and installs the theme, in one step and with no preset code.

- **It is the preset and the theme.** `components.json` gets the preset's choices (style `base-luma`, lucide icons, the menu settings) and the `@pmndrs` namespace, the project gets Inter and the default radius, and `theme` brings the Material Design 3 palette and the mono font.
- **Init only.** It replaces shadcn's stock style rather than sitting on it, so run it on a fresh project. In a project that is already set up, add `theme` instead.
- **The colours are `theme`'s.** This item declares none: shadcn's stock neutrals would land after the MD3 remap and override it.
- **The namespace serves the latest release.** For a pinned version, init with the preset code and add `theme` at a tag, as the Quick start does.
