The colours are already working. The pmndrs palette is baked into the CSS this item writes, so there is nothing to mount, no provider, and no client JavaScript.

Two things to know:

- **This is the item to depend on.** It pulls `md3-base` — the Tailwind `@theme` mapping, the shadcn remap and the seed — and adds the palette those point at.
- **The brand colours are named.** Lime, teal, cyan, purple, red, orange and yellow are custom colours: list them in the `@plugin` line `md3-base` added (`custom-colors: lime, teal, cyan, purple, red, orange, yellow;`) for `bg-lime`, `text-on-teal`, `bg-cyan-container`, `bg-purple-500` and the rest. Their shade utilities take over Tailwind's stock palettes of the same names.
- If you want a palette other than the pmndrs one, install **`md3-base`** instead and compute your own. See its docs. Installing both means committing 252 declarations you immediately override.
- **The bake is the seed's own output.** It is `builder(pmndrsMtb)` as Material Theme Builder computes it, with nothing redrawn on top, so `<Mtb>` or `builder()` at runtime with the same seed renders exactly these colours.
