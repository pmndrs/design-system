---
'@pmndrs/design-system': minor
---

Add a Motion foundations page: the transition durations and ease curves your project gets, as Tailwind v4 ships them.

- The page lists the two variables a transition falls back on (`--default-transition-duration`, `--default-transition-timing-function`), the `duration-*` steps and the `ease-*` curves, in the same table format as the other foundations pages.
- The foundations tables are read in one place, `scripts/foundations.mjs`, and tested against Tailwind v4's own defaults wherever a page says it inherits them.
