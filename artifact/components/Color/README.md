Swatches of the theme's Material 3 colour roles, as Material's scheme poster shows them: `Color` is a disc inline in text, or a cell with the role's name on it; `ColorGroup` fuses cells into one rounded block.

Color is a pmndrs block from `pmndrs/docs`, the generator behind the documentation sites of the pmndrs libraries, where it illustrates colour pages.

## Install

```sh
npx shadcn@latest add pmndrs/docs/color#{{docsRef}}
```

The block is released at the `{{docsRef}}` tag of `pmndrs/docs`. The add pulls `class-variance-authority` and the colour layer with it, still pinned under its name before {{themeRename}}: `{{blocksColourLayer}}`. In a new app, the pmndrs theme today is `pmndrs/design-system/theme#{{release}}`.

## Use

```tsx
import { Color, ColorGroup } from "@/components/color"

<p>The accent, <Color role="primary" />, and a pmndrs colour, <Color role="lime" />.</p>

<ColorGroup orientation="vertical">
  <Color role="primary" variant="cell" />
  <Color role="on-primary" variant="on" />
</ColorGroup>
```

## What you provide

- `role` (string): an MD3 role in kebab-case, `primary`, `on-primary-fixed-variant`, `surface-container-high`, or a custom colour, `lime`. Its `md-sys-color-<role>` variable is the background, the role in Title Case the label.
- `ink` (optional string): the role of the text; by default the one Material pairs with `role` (`on-primary` on `primary`, `on-surface` on any surface).
- `color` (optional string): any CSS colour, for a colour that is not a role of the theme. It wins over `role`, which then only gives the label.
- `variant`: `pill` (the default), a disc with no label; `cell`, a rounded square with the label; `on`, the strip, as tall as its label, of the role that goes on the cell above it.
- `size`: `sm`, `md` (the default) or `lg`, the diameter of a pill or the side of a cell.
- `ColorGroup` takes `orientation`, `horizontal` (the default, columns of equal width) or `vertical`, and nests as the rows of a block.

## Rules

- Use it to show the theme's colours, in docs and design references; it is not a colour picker, a badge or a status chip.
- Pair a cell with its `on` strip, as the scheme poster does: a role is shown with the role that goes on it.
- Every swatch is painted from `md-sys-color-*`. Without the colour layer (`theme`, or `md3` before {{themeRename}}) every swatch is transparent, and nothing reports it.
- The block is the one rounded (`radius-lg`); its cells are a hairline apart. A group has no margin: space it from the page.

The preview is a static rendition: plain markup styled with this system's tokens, hand-written from `registry/color/color.tsx` at `pmndrs/docs@{{docsRef}}`, not the built component.
