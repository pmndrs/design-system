---
'@pmndrs/design-system': minor
---

Start a project from the hosted registry, with `shadcn init` or in v0.

- `preset` (new, `registry:base`) is the poimandres preset and the theme in one item: `npx shadcn@latest init https://pmndrs.github.io/design-system/r/preset.json` configures style `base-luma`, Inter, the default radius and lucide icons, installs `theme`, and declares the `@pmndrs` namespace in `components.json`. No preset code needed. Its colours are `theme`'s: it declares none, so the MD3 remap stays in charge.
- `v0` (new, `registry:item`) is what the README's "Open in v0" link opens: one `app/globals.css` with shadcn's colours resolved to the pmndrs palette, light and dark, Inter, Inconsolata and the default radius. v0 reads neither `css` nor `cssVars`, so the theme travels as a file.
- `font-mono` now names `'Inconsolata Variable', monospace`, the family `@fontsource-variable/inconsolata` registers. Outside Next, `--font-mono` named `Inconsolata` and only rendered where the font was installed locally.
