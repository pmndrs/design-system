Four files, in `design/tokens/pmndrs/` at the root of your project. They are the pmndrs design system as [DTCG](https://www.designtokens.org) design tokens, for Figma:

| File | What it holds | Read by |
| --- | --- | --- |
| `Light.tokens.json`, `Dark.tokens.json` | The palette, light and dark: two modes of one variable collection | Figma's "Import variables" |
| `Foundations.tokens.json` | Font families, sizes, line heights and weights; spacing; radius; durations and ease curves: one mode of a second collection | Figma's "Import variables" |
| `Styles.tokens.json` | A text style per step of the type scale, and an effect style per shadow | Tokens Studio |

- **They are the values your code gets.** The colours are the ones `theme` bakes into CSS, hex for hex, roles aliased onto the tonal shades (`{ref.palette.Neutral.98}`) the way the CSS uses `var()`. The foundations are the tables of the Typography, Spacing, Radius, Shadows and Motion pages of the docs.
- **Nothing in your app reads them.** No code this registry installs imports them, and they are outside `public/`, so nothing serves them either.

To update them, add the item again at the newer tag, with `--overwrite`, and import them again.

## Variables: Figma's native import

1. In the Variables view, create a collection named `Colours`, and drag `Light.tokens.json` and `Dark.tokens.json` into it together. Each file becomes a mode.
2. Create a second collection named `Foundations`, and drag `Foundations.tokens.json` into it on its own. It has one mode, so switching Light and Dark does not duplicate it.
3. To update a collection later, right-click a mode, choose "Import mode" and pick the newer file.

The foundations are written for that import, so a few values differ from their CSS:

- **Every length is in px**: `spacing/4` is `16`, `font/size/xs` is `12`. Figma imports a dimension in px only, and the CSS `rem` is at a 16px root.
- **A line height is its px**: `font/line-height/xs` is `16`, not the `calc(1 / 0.75)` the CSS writes. Figma binds a number variable on a line height as pixels.
- **A duration is in seconds**: `duration/150` is `0.15`. Figma imports a duration in seconds only.
- **A font family is one name**: `Inter`, not a stack. Figma refuses an array.
- **Each variable is scoped to the pickers it belongs in**: spacing to gaps and sizes, radius to corners, the font variables to their text properties. Durations and ease curves are offered in no picker.

Two things the import does not carry:

- **The weight scope.** `font/weight/*` imports as numbers, but Figma drops their "Font weight" scope. Set it by hand once, in the variables' scoping settings.
- **The ease curves.** `ease/*` are `cubicBezier` tokens, a type Figma's import skips without a word. They stay in the file for other DTCG readers, and for a prototype transition you build by hand.

## Styles: Tokens Studio

Text and effect styles are composites, which Figma's import does not create. [Tokens Studio](https://tokens.studio) does, from `Styles.tokens.json`. The file is in Tokens Studio's own shape rather than DTCG 2025.10: a dimension is a string (`12px`), a shadow is `x`, `y` and a `type`, because Tokens Studio reads nothing else. It is one file with two token sets: `foundations`, the font values the styles name, and `styles`, the styles themselves.

1. Import the variables first, as above, in the same Figma file.
2. In Tokens Studio, add a sync provider that reads the one file, read-only:
   - **URL**, no account needed: `https://raw.githubusercontent.com/pmndrs/design-system/main/figma/Styles.tokens.json`. Replace `main` with a release tag to pin one.
   - **GitHub**, with a token that can read public repositories: repository `pmndrs/design-system`, branch `main`, file path `figma/Styles.tokens.json`. Point it at the file, not at the `figma/` folder: a folder sync would load the colour files as sets too.
3. Set `foundations` as a source set and enable `styles`.
4. Export to Figma: styles only, typography and shadows, with "Create styles with variable references" on.

A text style then binds to the `Foundations` variables by name: `{font.size.xs}` is the variable `font/size/xs`. Change a variable and the styles follow. Shadows have no variables, so their values are written into the effect styles.

To re-sync after a release, pull from the provider and export again.
