---
'@pmndrs/design-system': minor
---

`figma-tokens` ships the foundations beside the palette: four files instead of two.

- `Foundations.tokens.json` is a second Figma variable collection, imported natively: font families, sizes, line heights and weights, spacing, radius, durations and ease curves, each scoped to the pickers it belongs in. Lengths and line heights are in px and durations in seconds, the units Figma's import takes.
- `Styles.tokens.json` is a text style per step of the type scale and an effect style per shadow, for Tokens Studio, synced read-only from the one file. The text styles bind to the variables by name.
- Every value is read off the Typography, Spacing, Radius, Shadows and Motion pages, and tested against them and against the Claude Design artifact's tokens.
- The Typography page gains a Font weight table, Tailwind v4's `font-*` scale, which the font weight variables are read from.
