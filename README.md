# pmndrs design system

Tier 1 of the pmndrs UI distribution — the layer every pmndrs site shares:

- **`md3`**, a shadcn registry item carrying the colours (Material Design 3, seeded on poimandres mint);
- **`poimandres`**, a shadcn preset carrying radius and typography.

Blocks are Tier 2 and live in the repo that owns them, not here.

## Adopting it

Two independent channels, and neither implies the other: the preset ships no colours,
the registry item ships no radius or typography.

### 1. Colours

```sh
npx shadcn@latest add pmndrs/design-system/md3#v0.3.0
```

That's the whole step. The palette is **baked** into the CSS the item writes, so the
colours render immediately — nothing to mount, no provider, no client JavaScript.

Alongside it you get `lib/md3.ts` (the seed the bake was generated from), the package's
Tailwind `@theme` mapping, and a `:root, .dark` block remapping shadcn's colour
variables onto MD3 roles — so `bg-primary` and `bg-surface-dim` both work.

That remap has to stay **after** the stock `:root {}` / `.dark {}` ones, and its
combined selector is deliberate: it re-substitutes the shadcn variables in dark mode
instead of leaving them fixed at their light value.

`md3` is two composed items: **`md3-base`**, the plumbing that ships no colours, and
`md3` itself, which adds the baked palette on top through `registryDependencies`.
You only need to know that if you **reseed** — see [Reseeding](#3-reseed-optional).

Baking is what makes reseeding optional. Before it, an unmounted `<Mtb>` left every
variable the remap points at undefined, which took down the host app's whole palette
silently — a bad thing to inherit by installing a block.

### 2. Radius + typography

```sh
npx shadcn@latest apply b5cR4Y50S --only theme
```

`b5cR4Y50S` is `poimandres` v0 — `nova`, teal, `lucide`, Inter, default radius. It is
decoded into [`preset.json`](./preset.json) so the identity is reviewable in git rather
than living only inside the code; `npx shadcn preset decode b5cR4Y50S` prints the same
thing, and [`ui.shadcn.com/create?preset=b5cR4Y50S`](https://ui.shadcn.com/create?preset=b5cR4Y50S)
opens it in the builder — the place to fork it into a v1.

`teal` rather than poimandres mint because a preset code is a bit-packed tuple of
enums — there is no field for a hex. Of the 25 named themes, `teal` is the nearest
(OKLCH hue 182.5 against mint's 176.5, near-identical chroma). It never renders
anyway; step 1 owns colour.

`--only theme` is the usual choice: it brings the radius scale and leaves your fonts
alone. Use `--only theme,font` only if your site doesn't self-host its typography.
The colour half of the preset is inert either way — step 1's remap overrides it.

Run `apply` on its own branch. It rewrites CSS variables, and the remap from step 1
has to survive it.

### 3. Reseed (optional)

Skip this unless your site wants a palette other than the pmndrs one. Steps 1 and 2
are complete on their own.

If you do reseed, install **`md3-base`** rather than `md3` — the plumbing without the
baked palette, since you are supplying one:

```sh
npx shadcn@latest add pmndrs/design-system/md3-base#v0.3.0
```

Then emit it from a React Server Component. `builder` is the root export and carries
no `'use client'`, so no palette code reaches the browser:

```tsx
import { builder } from 'material-theme-builder'
import { pmndrsMtb } from '@/lib/md3'

const { source, ...rest } = pmndrsMtb
const css = builder(source, rest).toCss()
// <style dangerouslySetInnerHTML={{ __html: css }} /> in <head>
```

That repeats the palette in every document — ~32 kB raw, but ~2 kB brotli, since it is
all hex declarations. Hoisting it into your stylesheet with a build step saves that,
and costs a generated file plus an import-order rule that fails silently whenever your
seed matches the baked default. Measure before you pay for it.

`<Mtb>` from `material-theme-builder/react` does the same as a client component. Avoid
it where you render on the server; it is the right tool where there is no build to hook
— a Storybook preview decorator, say. With `next-themes`, nest `<ThemeProvider>` inside
it, not around it.

The seed comes from the environment, so a deployment can move the palette without
touching code:

```sh
THEME_PRIMARY=#5de4c7 THEME_SCHEME=tonalSpot THEME_CONTRAST=0
```

`THEME_CONTRAST` is the one to remember: it moves the *role* layer, not just the tonal
hexes, so it is the one setting the baked palette cannot approximate for you.

Because you installed `md3-base` rather than `md3`, nothing defines these variables but
you — so there is no cascade to fight. Install both and you inherit one: yours has to
land after the baked block, same `:root` / `.dark` selectors, later in the stylesheet,
and getting it wrong fails invisibly whenever your seed matches the default.

## Colours M3 has no role for

Alert levels, a status palette, anything the M3 roles don't name: those belong to the
site or block that needs them, not here. Spread the seed into your own config rather
than editing the installed file, so the next update of the item stays a clean overwrite:

```ts
export const myMtb = {
  ...pmndrsMtb,
  customColors: [{ name: 'note', hex: '#1f6feb', blend: true }],
} satisfies MtbConfig
```

`blend: true` harmonizes them against the pmndrs seed, so they stay yours and still
belong to the palette.

Then write the `@theme` lines yourself — four per colour: `--color-note`,
`--color-on-note`, `--color-note-container`, `--color-on-note-container`. The package's
mapping covers standard M3 roles only. Miss a line and Tailwind emits no rule at all for
`bg-note-container`, with no error, which is why the config and its mapping should sit
next to each other wherever they end up.

## Using the tokens

shadcn's tokens are the base; MD3 is additive. Write `bg-primary`, `text-muted-foreground`,
`border-border` like anywhere else, and reach for an MD3 role only where shadcn has no
equivalent — `bg-surface-dim`, `bg-primary-container`, `text-on-primary-fixed`, the tonal
shades. Where the two are 1:1 (`border-outline-variant` vs `border-border`), prefer the
stock token: it's what a consumer who skipped step 1 still has.

## Pinning

Always pin a ref — `pmndrs/design-system/md3#v0.3.0`, a tag, branch or SHA.

Refs are **not inherited**. A ref on the outer `add` does not propagate to
`registryDependencies`, so every cross-registry dependency has to carry its own.

## Promoting a component

A block needs another component. In order:

- a shadcn primitive → `registryDependencies: ["button"]`;
- something shared across pmndrs blocks → promote it to its own registry item and depend
  on it by full address, pinned (`pmndrs/docs/mdx-prose#v1.0.0`) — a bare name never means
  a same-repo item;
- something meaningful only here → another entry in the same item's `files`;
- trivial *and* app-specific → inline it.

Two rules for a block's own source: never hardcode a font family (use `font-sans` /
`font-mono`, so a consumer applying `--only theme` keeps its own typography), and take
icons from `components.json`'s `iconLibrary` — `lucide` is the pmndrs baseline, and a
consumer on another library swaps the imports after install.

## Working on this repo

```sh
npm install
npm run bake     # regenerate the palette after changing the seed
npm run lgtm     # asserts the bake is current, validates registry.json, round-trips the preset code
```

`registry/md3/md3.ts` is the only place the seed lives; `npm run bake` reads it with no
`THEME_*` set and writes the resulting palette into the item's `cssVars`. So a seed change
is two commits' worth of diff in one — the four lines you edited, and the 252 generated
declarations. `lgtm` fails if you forget the second half.

None of these checks parses TSX or resolves a CSS variable. A block using a token its
dependencies don't supply fails silently — Tailwind emits no rule for an unknown
utility, with no error. The only thing that catches it is installing into a scratch
app outside any pmndrs repo and looking at it.
