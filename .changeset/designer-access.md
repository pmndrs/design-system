---
'@pmndrs/design-system': minor
---

Open the design system to designers and their tools: a hosted registry, a preset, a v0 theme, Figma foundation tokens, a Guidelines page and a Motion foundations page.

**Hosted registry.** The docs site hosts the registry, so it can be declared as a shadcn namespace.

- Every item is served as static JSON at `https://pmndrs.github.io/design-system/r/{name}.json`, with the index at `r/registry.json`. Add `"@pmndrs": "https://pmndrs.github.io/design-system/r/{name}.json"` to `registries` in `components.json`, then `npx shadcn@latest add @pmndrs/theme`. The shadcn MCP server reads the same namespace to list, read and install the items.
- The files are built from `registry.json` by `shadcn build` on every deploy of `main`, so the namespace serves the latest state of `main`. The git address (`pmndrs/design-system/theme#<tag>`) is unchanged and stays the pinned one.
- A branch's Vercel preview serves that branch's own `r/` files, but `preset`'s dependency on `theme` still resolves to the released tag, not to the branch.
- `npm run hosted-registry [dir]` writes the same files locally, into `public/r/` by default.

**Preset and v0.** Start a project from the hosted registry, with `shadcn init` or in v0.

- `preset` (new, `registry:base`) is the poimandres preset and the theme in one item: `npx shadcn@latest init https://pmndrs.github.io/design-system/r/preset.json` configures style `base-luma`, Inter, the default radius and lucide icons, installs `theme`, and declares the `@pmndrs` namespace in `components.json`. No preset code needed. Its colours are `theme`'s: it declares none, so the MD3 remap stays in charge.
- `v0` (new, `registry:item`) is what the README's "Open in v0" link opens: one `app/globals.css` with shadcn's colours resolved to the pmndrs palette, light and dark, Inter, Inconsolata and the default radius. v0 reads neither `css` nor `cssVars`, so the theme travels as a file.
- `font-mono` now names `'Inconsolata Variable', monospace`, the family `@fontsource-variable/inconsolata` registers. Outside Next, `--font-mono` named `Inconsolata` and only rendered where the font was installed locally.

**Figma foundation tokens.** `figma-tokens` ships the foundations beside the palette: four files instead of two.

- `Foundations.tokens.json` is a second Figma variable collection, imported natively: font families, sizes, line heights and weights, spacing, radius, durations and ease curves, each scoped to the pickers it belongs in. Lengths and line heights are in px and durations in seconds, the units Figma's import takes.
- `Styles.tokens.json` is a text style per step of the type scale and an effect style per shadow, for Tokens Studio, synced read-only from the one file. The text styles bind to the variables by name.
- Every value is read off the Typography, Spacing, Radius, Shadows and Motion pages, and tested against them and against the Claude Design artifact's tokens.
- The Typography page gains a Font weight table, Tailwind v4's `font-*` scale, which the font weight variables are read from.

**Guidelines.** The brand book is published outside the Claude Design artifact: a Guidelines page on the docs site, and a `guidelines` item.

- The docs site gains a Guidelines section, right after Getting Started: the do and don't of colour, type, spacing, radii and shadows, components, the logo, iconography and voice. It flows into `llms-full.txt` and the pmndrs docs MCP with the rest of the site.
- `guidelines` (new, `registry:item`) writes the same text to `guidelines/Guidelines.md` at the root of the project: the file Figma Make reads, and one to point Claude or Cursor at.
- Both are generated from the artifact's `README.md`, so the three cannot drift. Passages that only make sense inside the artifact (the "Not synced" list) stay out, and the brand book now names tokens the way a stylesheet does: `--md-sys-color-surface-dim`, `--radius-sm`, `rounded-sm`, `p-4`.

**Motion.** A Motion foundations page: the transition durations and ease curves your project gets, as Tailwind v4 ships them.

- The page lists the two variables a transition falls back on (`--default-transition-duration`, `--default-transition-timing-function`), the `duration-*` steps and the `ease-*` curves, in the same table format as the other foundations pages.
- The foundations tables are read in one place, `scripts/foundations.mjs`, and tested against Tailwind v4's own defaults wherever a page says it inherits them.
