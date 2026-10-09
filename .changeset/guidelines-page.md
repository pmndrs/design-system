---
'@pmndrs/design-system': minor
---

Publish the brand book outside the Claude Design artifact: a Guidelines page on the docs site, and a `guidelines` item.

- The docs site gains a Guidelines section, right after Getting Started: the do and don't of colour, type, spacing, radii and shadows, components, the logo, iconography and voice. It flows into `llms-full.txt` and the pmndrs docs MCP with the rest of the site.
- `guidelines` (new, `registry:item`) writes the same text to `guidelines/Guidelines.md` at the root of the project: the file Figma Make reads, and one to point Claude or Cursor at.
- Both are generated from the artifact's `README.md`, so the three cannot drift. Passages that only make sense inside the artifact (the "Not synced" list) stay out, and the brand book now names tokens the way a stylesheet does: `--md-sys-color-surface-dim`, `--radius-sm`, `rounded-sm`, `p-4`.
