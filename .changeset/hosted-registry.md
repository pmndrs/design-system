---
'@pmndrs/design-system': minor
---

Host the registry on the docs site, so it can be declared as a shadcn namespace.

- Every item is served as static JSON at `https://pmndrs.github.io/design-system/r/{name}.json`, with the index at `r/registry.json`. Add `"@pmndrs": "https://pmndrs.github.io/design-system/r/{name}.json"` to `registries` in `components.json`, then `npx shadcn@latest add @pmndrs/theme`. The shadcn MCP server reads the same namespace to list, read and install the items.
- The files are built from `registry.json` by `shadcn build` on every deploy of `main`, so the namespace serves the latest release. The git address (`pmndrs/design-system/theme#<tag>`) is unchanged and stays the pinned one. A branch's Vercel preview serves that branch's own `r/` files.
- `npm run hosted-registry [dir]` writes the same files locally, into `public/r/` by default.
