---
'@pmndrs/design-system': minor
---

Add two items that ship files rather than code, as `registry:file`s copied byte for byte to their `target`:

- `pmndrs-logo`: the four SVGs of the Assets page — `logo_complete`, `logo_idle`, `logo_animated` and `logo_loading` — into `public/pmndrs/`, so `<img src="/pmndrs/logo_loading.svg" />` works as installed. The PNGs stay downloads: the CLI reads every file as text.
- `pmndrs-tokens`: the Figma tokens, `Light.tokens.json` and `Dark.tokens.json`, into `design/tokens/pmndrs/` — the same DTCG files `figma/` has, now with an install address.

Both land at the root of the project, `src/` directory or not: every target starts with `~/`. A bare `public/…` target would have landed in `src/public/` in an app made with `create-next-app --src-dir`, where nothing serves it.
