Inconsolata, the pmndrs monospace, as `--font-mono`: `font-mono` resolves to it, and `code`, `kbd`, `samp` and `pre` use it without a class.

- **You usually get this through `theme`**, which depends on it. Install it alone only if you want the font without the palette.
- **On Next.js** it loads through `next/font/google`. Elsewhere it installs `@fontsource-variable/inconsolata` and imports it.
- **Scoped to `code, kbd, samp, pre`.** The rest of your UI keeps its sans font. Without a selector, shadcn would put the mono class on `<html>` and turn the whole app monospace.
- **Named after its role, not the typeface.** If pmndrs changes its mono font, this item changes with it and your install command stays the same.
