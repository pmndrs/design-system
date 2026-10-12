---
"@pmndrs/design-system": minor
---

Add seven static source-seed themes (`theme-lime`, `theme-teal`, `theme-cyan`, `theme-purple`, `theme-red`, `theme-orange` and `theme-yellow`). The Colors page previews the same presets through a seed dropdown, using the existing Material Theme Builder controls. Emit complete light and dark declarations so installing another preset or restoring the default replaces every colour.

Only Lime keeps explicit neutral seeds; other presets use native MD3 neutral generation. Leave contrast out of the seed presets and preserve the reader's contrast preference in the preview. The seed table hides contrast and undefined entries.
