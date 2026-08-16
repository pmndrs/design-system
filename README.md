# pmndrs design system

Tier 1 of the pmndrs UI distribution — colours and identity, shared by every pmndrs site.
Blocks are Tier 2 and live in the repo that owns them.

| | what it carries |
|---|---|
| **`md3`** — registry item | Material Design 3 colours, seeded on poimandres mint |
| **`poimandres`** — shadcn preset | radius and typography |

Independent: the preset ships no colours, the item ships no radius.

## Install

```sh
npx shadcn@latest add pmndrs/design-system/md3#v0.3.0   # colours
npx shadcn@latest apply b5cR4Y50S --only theme          # radius + typography
```

Colours render immediately. The palette is baked into the CSS, so there is nothing to
mount, no provider, no client JavaScript.

`--only theme,font` instead, if your site doesn't self-host its typography. Run `apply`
on its own branch — it rewrites CSS variables, and the item's remap has to survive it.

## Try it

One command, from nothing to a themed page:

```sh
cd /tmp && rm -rf pmndrs-md3 && \
npx -y create-next-app@latest pmndrs-md3 --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes && \
cd pmndrs-md3 && \
npx -y shadcn@latest init --preset b5cR4Y50S --yes && \
npx -y shadcn@latest add pmndrs/design-system/md3#v0.3.0 --yes && \
printf '%s' 'export default function Home() {
  return (
    <main className="bg-background text-foreground min-h-screen space-y-4 p-10">
      <h1 className="text-2xl font-bold">pmndrs design system</h1>
      <div className="flex gap-3">
        <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2">bg-primary</button>
        <button className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2">bg-secondary</button>
      </div>
      <div className="bg-card rounded-xl border p-4">shadcn: bg-card + border</div>
      <div className="bg-surface-dim rounded-xl border p-4">MD3: bg-surface-dim</div>
      <div className="bg-primary-container text-on-primary-container rounded-xl p-4">MD3: bg-primary-container</div>
    </main>
  )
}' > src/app/page.tsx && \
npx next dev
```

Mint surfaces, filled buttons, `bg-surface-dim` and `bg-primary-container` both rendering
— with nothing mounted. Add `dark` to `<html>` for the dark scheme.

## Tokens

shadcn's tokens are the base; MD3 is additive. Write `bg-primary`,
`text-muted-foreground`, `border-border` as usual, and reach for an MD3 role only where
shadcn has no equivalent — `bg-surface-dim`, `bg-primary-container`,
`text-on-primary-fixed`, the tonal shades. Where the two are 1:1 (`border-outline-variant`
vs `border-border`), prefer the stock one.

## Reseeding

Skip unless your site wants a palette other than the pmndrs one.

Install **`md3-base`** rather than `md3` — the same plumbing without the baked palette,
since you supply one:

```sh
npx shadcn@latest add pmndrs/design-system/md3-base#v0.3.0
```

Then emit it from a React Server Component. `builder` is the root export and carries no
`'use client'`, so no palette code reaches the browser:

```tsx
import { builder } from 'material-theme-builder'
import { pmndrsMtb } from '@/lib/md3'

const { source, ...rest } = pmndrsMtb
const css = builder(source, rest).toCss()
// <style dangerouslySetInnerHTML={{ __html: css }} /> in <head>
```

`<Mtb>` from `material-theme-builder/react` does the same as a client component. Avoid it
where you render on the server; use it where there is no build to hook — a Storybook
preview decorator, say. With `next-themes`, nest `<ThemeProvider>` inside it.

The seed comes from the environment, so a deployment moves the palette without touching
code:

```sh
THEME_PRIMARY=#5de4c7 THEME_SCHEME=tonalSpot THEME_CONTRAST=0
```

`THEME_CONTRAST` is the one to remember: it moves the M3 *role* assignments, not just the
tonal hexes, so it is the setting a baked palette cannot approximate.

### Colours M3 has no role for

Alert levels, a status palette: those belong to the site or block that needs them, not
here. Spread the seed rather than editing the installed file:

```ts
export const myMtb = {
  ...pmndrsMtb,
  customColors: [{ name: 'note', hex: '#1f6feb', blend: true }],
} satisfies MtbConfig
```

Each custom colour also needs four `@theme` lines of your own — `--color-note`,
`--color-on-note`, `--color-note-container`, `--color-on-note-container`. The package maps
standard M3 roles only, and a missing line means Tailwind emits **no rule at all** for
`bg-note-container`, with no error.

## Authoring a block

Always pin a ref — `pmndrs/design-system/md3#v0.3.0`. Refs are **not inherited**: a ref on
the outer `add` does not reach `registryDependencies`, so every cross-registry dependency
carries its own.

Needs another component?

- a shadcn primitive → `registryDependencies: ["button"]`
- shared across pmndrs blocks → its own item, depended on by full pinned address
  (`pmndrs/docs/mdx-prose#v1.0.0`) — a bare name never means a same-repo item
- meaningful only here → another entry in the same item's `files`
- trivial *and* app-specific → inline it

Never hardcode a font family (`font-sans` / `font-mono`, so `--only theme` leaves a
consumer's typography alone). Take icons from `components.json`'s `iconLibrary`; `lucide`
is the pmndrs baseline.

## Working on this repo

```sh
npm install
npm run bake   # regenerate the palette after changing the seed
npm run lgtm   # bake is current, registry.json valid, preset code round-trips
```

`registry/md3/md3.ts` is the only place the seed lives. `md3` is composed on top of
`md3-base` through `registryDependencies`, and carries nothing but the 252 generated
declarations `bake` writes.

No check here parses TSX or resolves a CSS variable. A block using a token its
dependencies don't supply fails silently — Tailwind emits no rule and no error for an
unknown utility. Installing into a scratch app outside any pmndrs repo is the only thing
that catches it, which is what **Try it** above is for.

Design decisions, measurements and CLI traps: [#1](https://github.com/pmndrs/design-system/issues/1).
