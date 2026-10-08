---
"@pmndrs/design-system": minor
---

Reseed the palette with the brand lime under Material Theme Builder's Color match, with greyer neutrals.

`pmndrsMtb` now seeds `source: '#CAF543'` with `colorMatch: true` ("Stay true to my color inputs") in place of the poimandres slate `#323e48` under `scheme: 'tonalSpot'`, and seeds the neutral ramps and the error role itself: `neutral: '#c1b793'`, `neutralVariant: '#495720'`, `error: '#FF4980'`. Under Color match a neutral ramp takes an eighth of its seed's chroma (neutral-variant adds 4), so those seeds give surfaces and body text a warm grey at chroma 2, and outlines and secondary text the lime's hue at chroma 8. The light background moves from `#f7f9ff` to `#fef8f4`, the dark one from `#101417` to `#141311`. `THEME_SCHEME` is gone; `THEME_NEUTRAL`, `THEME_NEUTRAL_VARIANT` and `THEME_ERROR` are new, each a seed read the same way as `THEME_PRIMARY`.

The palette is Material Theme Builder's output with nothing redrawn on top, so `builder(pmndrsMtb)` or `<Mtb>` at runtime renders exactly what the baked `md3` ships, and the Figma tokens follow.

Color match moves other roles too:

- Containers take their seed's hex, or a shade of it where the light scheme needs a darker one: light `primary-container` and `lime-container` are the lime `#caf543`, `teal-container` `#00f7a3`, `cyan-container` `#2bdcf6`, `orange-container` `#ffc043`; light `error-container` / `red-container` are `#da2b66` and `purple-container` `#b833da`, against `#ff4d82` and `#d956f9` in dark. Their on-container colours are re-picked to match, so `on-error-container` is now `#fffbff` in light.
- In dark mode `primary`, `tertiary`, `lime` and `yellow` are `#ffffff`, and `teal`, `cyan` and `orange` near-white tints.
- Secondary and tertiary follow the lime: secondary is an olive, tertiary a vivid green.
- As in Material Theme Builder, custom colours keep their standard-contrast roles at medium and high contrast; only the core roles move. The bake is standard contrast, so it is unaffected.
