The colours are already working. The pmndrs palette is baked into the CSS this item writes, so there is nothing to mount, no provider, and no client JavaScript.

Two things to know:

- **This is the item to depend on.** It pulls `md3-base` — the Tailwind `@theme` mapping, the shadcn remap and the seed — and adds the palette those point at, the seed's two example custom colours (`brand`, `status`) included. Their `bg-brand` / `text-on-status` utilities need the `@plugin` body `custom-colors: brand, status;` — see `md3-base`'s docs.
- If you want a palette other than the pmndrs one, install **`md3-base`** instead and compute your own. See its docs. Installing both means committing 252 declarations you immediately override.
