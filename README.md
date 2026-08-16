# pmndrs design system

Tier 1 of the pmndrs UI distribution — the layer every pmndrs site shares:

- **`md3`**, a shadcn registry item carrying the colours (Material Design 3, seeded on poimandres mint);
- **`poimandres`**, a shadcn preset carrying radius and typography.

Blocks are Tier 2 and live in the repo that owns them, not here.

## Adopting it

Two channels plus one manual step. None of the three implies the others: the preset
ships no colours, the registry item ships no radius or typography, and neither can
touch your root layout.

### 1. Colours

```sh
npx shadcn@latest add pmndrs/design-system/md3#v0.1.0
```

Installs `material-theme-builder`, drops `lib/md3.ts` (the pmndrs seed), and writes
into your CSS: the package's Tailwind `@theme` mapping, and a `:root, .dark` block
remapping shadcn's colour variables onto MD3 roles.

That block has to stay **after** the stock `:root {}` / `.dark {}` ones. The combined
selector is deliberate — light/dark is delegated to MD3 re-emitting its variables,
not to the `.dark` class.

### 2. Radius + typography

```sh
npx shadcn@latest apply b5cR4Y50S --only theme
```

`b5cR4Y50S` is `poimandres` v0 — `nova`, teal, `lucide`, Inter, default radius. It is
decoded into [`preset.json`](./preset.json) so the identity is reviewable in git rather
than living only inside the code; `npx shadcn preset decode b5cR4Y50S` prints the same
thing.

`teal` rather than poimandres mint because a preset code is a bit-packed tuple of
enums — there is no field for a hex. Of the 25 named themes, `teal` is the nearest
(OKLCH hue 182.5 against mint's 176.5, near-identical chroma). It never renders
anyway; step 1 owns colour.

`--only theme` is the usual choice: it brings the radius scale and leaves your fonts
alone. Use `--only theme,font` only if your site doesn't self-host its typography.
The colour half of the preset is inert either way — step 1's remap overrides it.

Run `apply` on its own branch. It rewrites CSS variables, and the remap from step 1
has to survive it.

### 3. Mount it

The CLI cannot edit your root layout, so nothing renders until you do this yourself.

```tsx
import { Mtb } from 'material-theme-builder/react'
import { pmndrsMtb } from '@/lib/md3'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Mtb {...pmndrsMtb}>{children}</Mtb>
      </body>
    </html>
  )
}
```

`<Mtb>` is the only thing in the package carrying `'use client'`. To keep it off the
client, call `builder` from a React Server Component and emit `toCss()` into `<head>`
yourself. With `next-themes`, nest `<ThemeProvider>` inside, not around.

### 4. Reseed, per deployment

```sh
THEME_PRIMARY=#5de4c7 THEME_SCHEME=tonalSpot THEME_CONTRAST=0
```

The seed is what moves the rendered palette — the preset is not.

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

Always pin a ref — `pmndrs/design-system/md3#v0.1.0`, a tag, branch or SHA.

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
npm run lgtm     # validates registry.json, round-trips the preset code
```

Neither check parses TSX or resolves a CSS variable. A block using a token its
dependencies don't supply fails silently — Tailwind emits no rule for an unknown
utility, with no error. The only thing that catches it is installing into a scratch
app outside any pmndrs repo and looking at it.
