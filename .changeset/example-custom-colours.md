---
'@pmndrs/design-system': minor
---

The seed carries two custom colours, `brand` (`#ff2d95`, blended toward the slate) and
`status` (`#17b26a`, true to its hex). They are placeholders: there to show the whole path a
custom colour takes — `customColors` in `md3.ts`, four roles each in the baked `:root` /
`.dark` of `md3` (`--md-sys-color-brand`, `-on-brand`, `-brand-container`,
`-on-brand-container`, and the same for `status`), 18 tonal shades each in the Figma tokens,
a row each on the docs' colour page — before real ones replace them. Nothing existing moves:
every declaration `md3` already baked keeps its value, so this is additive, hence a minor.

The utilities do not follow on their own. shadcn writes the `@plugin` line of `md3-base` in
statement form whatever the registry puts under it, so `bg-brand` and `text-on-status` exist
only once a consumer gives that line its body, `custom-colors: brand, status;` — the item's
docs say so, and the same body is where their own custom colours go.
