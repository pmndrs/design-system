Poimandres is a distributed design system: nothing is installed from npm. It ships as a shadcn preset and a shadcn registry, so every pmndrs app gets the same colours by copying code in. shadcn's tokens are the base; Material Design 3 colour roles are additive, for what shadcn has no name for.

<!-- artifact-only -->
The full documentation is at [pmndrs.github.io/design-system](https://pmndrs.github.io/design-system/), which follows `main`. This system is synced to `main`, release {{release}}: the colours, fonts and radii here match that site.
<!-- /artifact-only -->

In code, one add brings the whole theme (the palette, the colour machinery under it and the mono font): `npx shadcn@latest add pmndrs/design-system/theme#{{release}}`.

## Colour

No colour is picked by hand. A few seeds go in and Material Design 3 computes every role from them, for light and dark alike.

| Option | Value |
| --- | --- |
| `source` | `#CAF543` (poimandres lime) |
| `colorMatch` | `true` |
| `contrast` | `0` |
| `neutral` | `#c1b793` |
| `neutralVariant` | `#495720` |
| `error` | `#FF4980` |

`colorMatch` is Material Theme Builder's "stay true to my color inputs": each seed keeps its chroma and lands in its container role. The two neutral seeds look nothing like the grey ramps they produce, by design: a neutral ramp takes an eighth of its seed's chroma.

- Never write a hex. Use a role; if the palette must change, change the seed and recompute.
- Reach for the shadcn token first: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`. Use an `--md-sys-color-*` role only where shadcn has no equivalent (`--md-sys-color-surface-dim`, `--md-sys-color-tertiary-container`, `--md-sys-color-on-surface-variant`).
- Never build with `--md-ref-palette-*` shades directly. They are the tonal ramps the roles alias, and they do not change between schemes.
- Every fill has the role meant to go on it. Put `primary-foreground` on `primary`, `secondary-foreground` on `secondary`, `accent-foreground` on `accent`, `--md-sys-color-on-<role>` on `--md-sys-color-<role>`, and `--md-sys-color-on-<role>-container` on `--md-sys-color-<role>-container`.
- Set body text in `foreground` and lower-emphasis text in `muted-foreground`, on `background`, `card`, `popover` or `muted`.
- `secondary` and `accent` are the MD3 secondary *container* (`--md-sys-color-secondary-container`), not `--md-sys-color-secondary`.
- Draw control boundaries with `input`. `border` is decorative: it is too faint (under 2:1 on `background`) to be the only thing marking a control.
- Draw focus with `ring`.
- Colour chart series with `chart-1` to `chart-5`, in that order. They are the fixed roles, so a chart keeps its colours in light and dark.
- The seed hex itself is the *container* role: `--md-sys-color-primary-container` is the lime. `primary` is a dark olive in light and white in dark, so use the container where the brand colour itself must show.
- `--md-sys-color-secondary` and `--md-sys-color-tertiary` are generated but intentionally unused as accents: the named brand colours take their place.
- The dark scheme is the `dark` class on `<html>`.
- Designers get the same palette as Figma tokens, light and dark as two modes of one variable collection: `npx shadcn@latest add pmndrs/design-system/figma-tokens#{{release}}`. The same item carries type, spacing, radius and motion as a second collection, and the text and shadow styles as a file for Tokens Studio.

### shadcn tokens and the roles they point at

| shadcn token | MD3 role |
| --- | --- |
| `background` | `--md-sys-color-surface` |
| `foreground`, `card-foreground`, `popover-foreground` | `--md-sys-color-on-surface` |
| `card`, `sidebar` | `--md-sys-color-surface-container-low` |
| `popover` | `--md-sys-color-surface-container-high` |
| `muted` | `--md-sys-color-surface-container-highest` |
| `muted-foreground` | `--md-sys-color-on-surface-variant` |
| `primary`, `ring` | `--md-sys-color-primary` |
| `primary-foreground` | `--md-sys-color-on-primary` |
| `secondary`, `accent` | `--md-sys-color-secondary-container` |
| `secondary-foreground`, `accent-foreground` | `--md-sys-color-on-secondary-container` |
| `destructive` | `--md-sys-color-error` |
| `input` | `--md-sys-color-outline` |
| `border` | `--md-sys-color-outline-variant` |
| `chart-1` … `chart-5` | `--md-sys-color-primary-fixed`, `-secondary-fixed`, `-tertiary-fixed`, `-primary-fixed-dim`, `-secondary-fixed-dim` |

The `sidebar-*` tokens follow their counterparts: `sidebar-foreground` is `foreground`, `sidebar-primary` is `primary`, `sidebar-primary-foreground` is `primary-foreground`, `sidebar-accent` is `accent`, `sidebar-accent-foreground` is `accent-foreground`, `sidebar-border` is `border`, `sidebar-ring` is `ring`.

### Brand colours

The seven brand colours are declared next to the seed as custom colours, none of them blended: each stays its exact hex. Each becomes four roles: `--md-sys-color-<name>`, `-on-<name>`, `-<name>-container`, `-on-<name>-container`.

| Name | Seed |
| --- | --- |
| `lime` | `#CAF543` |
| `teal` | `#00F7A3` |
| `cyan` | `#2BDCF6` |
| `purple` | `#D855F9` |
| `red` | `#FF4980` |
| `orange` | `#FFC043` |
| `yellow` | `#EBFF0F` |

- Lime is also the `source` seed, and red also drives the error role: `destructive` and `--md-sys-color-red` are the same colour.
- For the brand hex as a fill, use `--md-sys-color-<name>-container` with `--md-sys-color-on-<name>-container` on it.
- Their shade utilities (`bg-purple-500`) take over Tailwind's stock palettes of the same names.

## Type

- The preset's font is Inter (`sans`), and headings inherit it. Never hardcode a font family in a block.
- The type scale is Tailwind's default: `text-xs` to `text-9xl`, inherited, not yet a pmndrs decision. Set UI text in `text-sm` and body copy in `text-base`; choose weight with Tailwind's `font-*` utilities.
- `mono` is Inconsolata, from the `font-mono` registry item that `theme` depends on. It is scoped to `code, kbd, samp, pre`: those elements use it without a class, and the rest of the UI keeps Inter. In app code, add `font-mono` to any other element that should be monospace; a block never does.
- Headings, paragraphs, lists and inline code follow shadcn's Typography class recipe (inline code: `font-mono text-sm font-semibold` on `bg-muted`). No element is styled by default.

## Spacing, radii and shadows

Poimandres is shadcn-based, so outside colour, fonts and the base radius it embraces Tailwind's defaults. The repository's docs say which is which: the radius is a pmndrs decision; spacing and shadows are inherited from Tailwind v4.

- Space with the Tailwind scale, multiples of `--spacing` (0.25rem): step 1 (`p-1`, `gap-1`) is 0.25rem, step 4 (`p-4`) is 1rem; never an arbitrary pixel value.<!-- artifact-only --> Here each step is also a variable, `--spacing-1` to `--spacing-96`.<!-- /artifact-only -->
- Every corner derives from one value, `--radius` (0.625rem), from the preset. Its {{presetStyle}} style multiplies it: `--radius-sm` is ×0.6, `--radius-lg` is `--radius` itself, `--radius-4xl` is ×2.6. Round with `rounded-sm` to `rounded-4xl`; change `--radius` and every corner rescales. `rounded-xs` (`--radius-xs`) is Tailwind's own step, outside that scale.
- Elevate with `shadow-2xs` to `shadow-2xl`, recess with `inset-shadow-2xs` to `inset-shadow-sm`, and shadow shapes that are not boxes (icons, SVGs) with `drop-shadow-xs` to `drop-shadow-2xl`. Shadows are black at low opacity in both schemes; in dark, set surfaces apart with the `--md-sys-color-surface-container-*` steps instead.

## Components

Poimandres is a distributed architecture based on shadcn blocks: any `pmndrs/*` repository can contribute blocks, each installed with a single `shadcn add` command, plus shared defaults (colours, radius, every shadcn token) that stay overridable by the consumer app. It is fully shadcn-compatible: every shadcn component is supported as is, and takes the palette through the shadcn tokens. The system adds no component library of its own.

- Start from a shadcn primitive (`npx shadcn@latest add button`). Never restyle one with hardcoded colours; it already reads `primary`, `border`, `ring` and the rest.
- pmndrs' own components are *blocks*, distributed through shadcn's GitHub registries: any public `pmndrs/*` repository with a `registry.json` at its root is a registry. Install one by address: `npx shadcn@latest add pmndrs/docs/keypoints#{{docsRef}}`.
- Always pin a ref (a tag or a sha). Refs are not inherited: every entry in `registryDependencies` carries its own.
- A block depends on a shadcn primitive by bare name (`registryDependencies: ["button"]`) and on another pmndrs block by its full pinned address (`{{exampleBlockAddress}}`). A bare name never means a same-repo item.
- A block that uses colour depends on `pmndrs/design-system/theme`, so one add pulls the block and the colour layer with it, and the mono font through `font-mono`. `theme` is the single install target: it depends on `md3-base` (the colour machinery and the seed) and `font-mono`. Install `md3-base` alone only to compute a palette of your own.
- A block lives in the repository it was born in. It is promoted to `pmndrs/design-system` only once it has shipped in its own repository and a second repository reuses it. There is always exactly one source of truth; promotion moves it.
- Blocks are copied code, not a package: the consuming app owns the files and may override any shadcn token.
- A registry item is a set of files, so the same mechanism ships more than UI: a shader, a helper, a `SKILL.md`.
- Keypoints is the first block, born in `pmndrs/docs`, the generator behind several hundred pages of documentation across the pmndrs libraries. It is released at that repository's `{{docsRef}}` tag: `npx shadcn@latest add pmndrs/docs/keypoints#{{docsRef}}`. The same registry also holds Color, swatches of the MD3 roles: `npx shadcn@latest add pmndrs/docs/color#{{docsRef}}`. Both pin the colour layer, the pmndrs theme, at `{{blocksColourLayer}}`; in a new app the current one is `pmndrs/design-system/theme#{{release}}`. Planned, not yet available: shaders from `pmndrs/drei`, assets from `pmndrs/assets`, and blocks from other `pmndrs/*` repositories. Do not assume a block exists; check the owning repository's `registry.json`, or the registry catalog on the docs site, before installing.

## Logo

- Use `logo_complete.svg` <!-- artifact-only -->from the Logos group <!-- /artifact-only -->as the mark, as an image. `logo_idle.svg` is its resting state.
- Both paint their own black square background; there is no transparent variant. Never recolour, crop or redraw the mark.
- In code, `npx shadcn@latest add pmndrs/design-system/logo#{{release}}` writes all four states (`logo_complete`, `logo_idle`, `logo_animated`, `logo_loading`) to `public/pmndrs/`.
- MIT, like the rest of pmndrs/design-system. No attribution required.

## Iconography

- Icons are `lucide`, the pmndrs baseline, taken from the app's `components.json` `iconLibrary`. The repository ships no icon files.

## Voice

- British spelling: "colour", "harmonizes".
- Short declarative sentences that state a fact and its consequence: "No colour is picked by hand.", "Nothing mounted: the palette is baked into the CSS.", "Always pin a ref".
- Lowercase `pmndrs` and `shadcn` in running text; "Poimandres" when naming the collective. No emoji.

<!-- artifact-only -->
## Not synced

- From the repository (`main` at {{sha}}, release {{release}}): the colour layer, the font families and files, the base radius and its scale, and the two static logo SVGs.
- The type scale, spacing and shadows are Tailwind v4's defaults, as the repository's Typography, Spacing and Shadows pages list them: inherited, not pmndrs decisions. `radius-xs` is Tailwind's default step, which the Radius page lists as inherited.
- Fonts: only the latin subset of each, from `@fontsource-variable/inter` and `@fontsource-variable/inconsolata` {{fontsourceVersion}} (variable weight, normal style). The latin-ext, Cyrillic, Greek and Vietnamese subsets and Inter's italic are not stored.
- `logo_animated.svg` and `logo_loading.svg` are not included: their animation is CSS inside the file, which is stripped when stored here, leaving a still copy of the complete mark. The logo PNGs were not requested.
- The shadcn tokens are aliased as `material-theme-builder`'s `shadcn.css` maps them ({{mtbVersion}}, the `md3-base` dependency), every one of them.
- The eleven shades per custom colour (`lime-50` … `lime-950` and so on) are computed by the Tailwind plugin at build time and are not in the repository.
- shadcn's Typography element recipe (h1 to h4, lead, blockquote, lists) is classes, not tokens: only inline code has a style here.
- Components: shadcn's components are supported as they ship and have no cards here. Each pmndrs block of the registry catalog, Keypoints and Color, has a card with a static preview, hand-written from `pmndrs/docs@{{docsRef}}`, not the built component.
<!-- /artifact-only -->
