# Distributed Poimandres design-system

[![](https://img.shields.io/badge/figma_light-171c23.svg?logo=figma)](figma/Light.tokens.json)
[![](https://img.shields.io/badge/figma_dark-171c23.svg?logo=figma)](figma/Dark.tokens.json)

## Try it

```sh
cd /tmp && rm -rf pmndrs-foo && \
npx -y create-next-app@latest pmndrs-foo --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes && \
cd pmndrs-foo && \
npx -y shadcn@latest init --preset b5cR4Y50S --yes && \
npx -y shadcn@latest add pmndrs/docs/keypoints#ds --yes && \
printf '%s' 'import { Keypoints, KeypointsItem } from "@/components/keypoints"

export default function Home() {
  return (
    <main className="bg-background text-foreground min-h-screen p-10">
      <h1 className="text-2xl font-bold">pmndrs design system</h1>
      <Keypoints title="What this proves">
        <KeypointsItem>One add pulled the block and the colour layer with it</KeypointsItem>
        <KeypointsItem>The panel sits on bg-surface-dim, an MD3 role shadcn has none for</KeypointsItem>
        <KeypointsItem>Nothing mounted: the palette is baked into the CSS</KeypointsItem>
      </Keypoints>
    </main>
  )
}' > src/app/page.tsx && \
npx next dev
```

Add `dark` to `<html>` for the dark scheme.

## Tokens

[shadcn](https://ui.shadcn.com/docs/theming)'s are the base; MD3's `--md-*`
[roles](https://m3.material.io/styles/color/roles) are additive

## Reseeding (optional)

For a palette other than the pmndrs one: install `md3-base` — same plumbing, no
baked palette — and follow its docs.

```sh
npx shadcn@latest add pmndrs/design-system/md3-base#v0.3.0
```

Nothing renders until something emits `--md-sys-color-*`: regenerate the values
from your seed with [Mtb](https://www.npmjs.com/package/material-theme-builder).
Either side works.

```tsx
// RSC — `builder` is the root export and carries no 'use client'
const { source, ...rest } = pmndrsMtb;
<style dangerouslySetInnerHTML={{ __html: builder(source, rest).toCss() }} />;

// client — same output, from `material-theme-builder/react`
<Mtb {...pmndrsMtb}>{children}</Mtb>;
```

Prefer the server one where there is a server: it keeps the palette code off the
client. `<Mtb>` is for where there is no build to hook — a Storybook preview,
say.

## Authoring a block

Always pin a ref — `pmndrs/design-system/md3#v0.3.0`. Refs are **not
inherited**: every entry in `registryDependencies` carries its own.

- a shadcn primitive → `registryDependencies: ["button"]`
- shared across pmndrs blocks → its own item, by full pinned address
  (`pmndrs/docs/mdx-prose#v1.0.0`) — a bare name never means a same-repo item
- meaningful only here → another entry in the same item's `files`
- trivial _and_ app-specific → inline it

Never hardcode a font family (`font-sans` / `font-mono`). Icons come from
`components.json`'s `iconLibrary`; `lucide` is the pmndrs baseline.

## dev

```sh
npm install
npm run build   # regenerate registry.json + figma/*.tokens.json
npm run lgtm    # outputs are current and valid, preset code round-trips
```
