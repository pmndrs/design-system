The colours are already working. The pmndrs palette is baked into the CSS this item writes, so there is nothing to mount, no provider, and no client JavaScript.

Two things to know:

- **This is the item to depend on.** It pulls `md3-base` — the Tailwind `@theme` mapping, the shadcn remap and the seed — and adds the palette those point at.
- If you want a palette other than the pmndrs one, install **`md3-base`** instead and compute your own. See its docs. Installing both means committing 252 declarations you immediately override.
