The pmndrs theme as `app/globals.css` for [Open in v0](https://ui.shadcn.com/docs/registry/open-in-v0).

Open in v0 does not read `css` or `cssVars`, so this item supplies the theme as a CSS file with its dependencies. The `palette` registry item supplies `src/assets/pmndrs.css`, which the stylesheet imports. Only shadcn and MD3 utility mappings, fonts and radius are added here.

The item supplies no page, layout or logos. In your own project, install `theme` or `preset` instead.

See the [Open in v0 guide](https://pmndrs.github.io/design-system/getting-started/v0) for the import flow and shared palette.
