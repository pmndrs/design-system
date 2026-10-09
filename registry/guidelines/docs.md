One file, `guidelines/Guidelines.md` at the root of your project: the pmndrs brand book, the do and don't of the colour layer, type, spacing, radii and shadows, components, the logo, iconography and voice.

- **It is the Guidelines page of the docs site**, word for word: [pmndrs.github.io/design-system/guidelines](https://pmndrs.github.io/design-system/guidelines/introduction).
- **Figma Make reads it** from that path, so a Make project follows the pmndrs rules once it is there.
- **Point Claude or Cursor at it** (`@guidelines/Guidelines.md`, or a line in `CLAUDE.md` or a Cursor rule) so the UI they generate uses the shadcn tokens first and never a raw hex.
- **Nothing in your app reads it.** It is outside `public/`, so nothing serves it either.

To update it, add the item again at the newer tag, with `--overwrite`.
