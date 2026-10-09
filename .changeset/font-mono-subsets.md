---
'@pmndrs/design-system': patch
---

`font-mono` declares the `latin` subset, so on Next shadcn writes `subsets: ["latin"]` into the `next/font/google` call. Before, the call had no subsets: nothing was preloaded, and `next build --webpack` failed with "Preload is enabled but no subsets were specified". To fix an existing layout, re-run `shadcn add` for `font-mono` (or `theme`) at the new tag: it rewrites the `--font-mono` initializer.
