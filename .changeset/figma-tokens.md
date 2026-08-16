---
'@pmndrs/design-system': minor
---

`npm run build` now also writes `figma/Light.tokens.json` and `figma/Dark.tokens.json` —
the palette as DTCG tokens, two modes of one Figma variable collection. Nothing an
installed item carries changes; this is the same colours for the other half of the team.

They come off the same `builder()` call as the baked CSS rather than a second one, so
every one of the 434 values matches `registry.json` alias for alias — a designer picking
`Surface Container Low` gets the hex the site renders, and a reseed moves both in the same
run. Committed, 190 kB and all: nothing here is published to npm, so a tag is the only
address a designer can be handed.
