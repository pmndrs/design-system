---
'@pmndrs/design-system': minor
---

Make the `v0` item a whole v0 project, so Open in v0 needs no babysitting, and add a second Open in v0 link that asks v0 for the brand guidelines.

- `app/globals.css` now declares every Material Design 3 role (the primary, secondary and tertiary containers, the `surface-container` steps, the seven brand colours and the five alert colours, with their `on-*` roles) and the tonal shades, as literal values light and dark, read off the bake. They are mapped in `@theme inline` under the utility names a pmndrs project gets from `theme` and the MD3 Tailwind plugin: `bg-primary-container`, `bg-surface-container-high`, `bg-lime-container`, `bg-purple-500`. Code v0 writes runs unchanged in a pmndrs app.
- The brand lime is `bg-lime-container`, with `text-on-lime-container` on it. `bg-lime` is a dark olive in light.
- The stylesheet opens by saying it is the pmndrs palette, not the Poimandres VS Code theme, and that it is not to be edited.
- The item adds `app/layout.tsx` (the stylesheet, `lang="en"`, the fonts) and `app/page.tsx`, a starter that renders the logo, the brand colours, the type and a light/dark toggle through tokens only. The preview is no longer blank.
- The item ships the logo into `public/pmndrs/` and the brand book as `guidelines/Guidelines.md`, from the same files as the `logo` and `guidelines` items.
- The README and the getting-started page gain a "brand guidelines" Open in v0 link: the same item, with a prompt (under v0's 500-character limit) for 16:9 slides on an editorial grid. The build writes both links, so the prompt's token names follow the code.
