---
'@pmndrs/design-system': minor
---

Rename the `md3` item to `theme`, the single install target, and ship Inconsolata as the pmndrs monospace font.

- `theme` (was `md3`) carries the baked pmndrs palette and now depends on `md3-base` and the new `font-mono`. Breaking: replace `pmndrs/design-system/md3#<ref>` with `pmndrs/design-system/theme#<ref>`, in `shadcn add` commands and in `registryDependencies`.
- `font-mono` (new, `registry:font`) sets `--font-mono` to Inconsolata, through `next/font/google` on Next.js and `@fontsource-variable/inconsolata` elsewhere, applied to `code, kbd, samp, pre` only.
- `md3-base` is unchanged, and still installs on its own for a palette of your own.
