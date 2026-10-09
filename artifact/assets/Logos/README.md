The pmndrs logo, copied from the repository's `docs/assets/`.

- `logo_complete.svg`: the full mark, 600×600. Use it wherever the logo appears.
- `logo_idle.svg`: the resting state, four concentric rings, 600×600.

Use them as images. Each file paints its own black square background with the mark in white; there is no transparent variant yet, so do not place one expecting the page to show through, and do not recolour or crop it.

The repository also ships `logo_animated.svg` (idle to complete, once) and `logo_loading.svg` (a loop). Their animation is CSS inside the file, which is stripped when stored here, so they are not in this group. In code, `npx shadcn@latest add pmndrs/design-system/logo#{{release}}` installs all four into `public/pmndrs/`.

MIT, like the rest of pmndrs/design-system. No attribution required.
