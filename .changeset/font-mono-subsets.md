---
'@pmndrs/design-system': patch
---

`font-mono` declares the `latin` subset. On Next, shadcn writes `Inconsolata({ variable: "--font-mono" })` without `subsets`, and `next build` failed with "Preload is enabled but no subsets were specified"; it now writes `subsets: ["latin"]`.
