Two files, in `design/tokens/pmndrs/` at the root of your project: `Light.tokens.json` and `Dark.tokens.json`. They are the pmndrs palette as [DTCG](https://www.designtokens.org) design tokens — the light and dark modes of one Figma variable collection.

- **They are the colours `md3` bakes into CSS**, hex for hex. Roles stay aliased onto the tonal shades (`{ref.palette.Neutral.98}`), the way the CSS uses `var()`.
- **Import them into Figma** as variables, or feed them to a token pipeline (Style Dictionary, Tokens Studio).
- **Nothing in your app reads them.** They are not imported by any code this registry installs, and they are outside `public/`, so nothing serves them either.

To update them, add the item again at the newer tag, with `--overwrite`.
