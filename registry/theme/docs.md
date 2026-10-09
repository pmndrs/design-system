The colours are already working. The pmndrs palette is baked into the CSS this item writes, so there is nothing to mount, no provider, and no client JavaScript.

A few things to know:

- **This is the item to depend on.** It pulls `md3-base` — the Tailwind `@theme` mapping, the shadcn remap and the seed — and `font-mono`, the pmndrs monospace, and adds the palette the first points at.
- **The custom colours are named.** Seven brand colours (lime, teal, cyan, purple, red, orange, yellow) and five alert roles (note, tip, important, warning, caution). List them in the `@plugin` line `md3-base` added, for `bg-lime`, `bg-note-container`, `text-on-warning-container`, `bg-purple-500` and the rest:

  ```css
  @plugin "material-theme-builder/tailwind" {
    custom-colors: lime, teal, cyan, purple, red, orange, yellow, note, tip, important, warning, caution;
  }
  ```

  The brand colours' shade utilities take over Tailwind's stock palettes of the same names. Style alerts, hints and badges with the alert roles, not with a brand colour. The [Colors page](https://pmndrs.github.io/design-system/colors/introduction#custom-colours) lists their seeds.
- If you want a palette other than the pmndrs one, install **`md3-base`** instead and compute your own. See its docs. Installing both means committing a whole baked palette you immediately override.
- **The bake is the seed's own output.** It is `builder(pmndrsMtb)` as Material Theme Builder computes it, with nothing redrawn on top, so `<Mtb>` or `builder()` at runtime with the same seed renders exactly these colours.
