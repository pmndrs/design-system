---
'@pmndrs/design-system': minor
---

`material-theme-builder` moves to `^3.3.0`, and the shadcn remap stops being ours.

3.3.0 publishes the mapping we had been keeping by hand — `toShadcnRegistryItem()` returns
the same 31 pairs — so the build now reads it off the package instead of a literal. The
regenerated `registry.json` is identical line for line, which is the evidence the two had
not yet drifted; from here they cannot. The palette is untouched too: 3.2.0 and 3.3.0 emit
byte-identical CSS for this seed, all 217 declarations of it.

The item's declared dependency now follows the range the build resolved against, rather
than a second range to remember to bump.

Custom colours get an actual answer. They needed four hand-written `@theme` lines each,
and silently rendered nothing if you missed one; 3.3.0 ships a Tailwind plugin that takes
them by name — `@plugin "material-theme-builder/tailwind" { custom-colors: note; }` — and
brings the four roles plus eleven shades with it. `md3-base`'s docs say so now. Keep the
stylesheet `@import` alongside it: a plugin's theme values are defaults, so letting the
plugin carry the standard tokens alone would hand `background`, `primary` and `secondary`
back to shadcn.

One bug leaves with the bump: 3.2.0's shipped `tailwind.css` carried the README's example
custom colours, so every consumer's Tailwind gained thirty names like
`--color-myCustomColor1-500`. They are gone in 3.3.0, which adds `surface-tint` and
`surface-variant` in their place.
