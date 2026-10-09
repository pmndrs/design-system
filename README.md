[![](https://img.shields.io/badge/figma_light-171c23.svg?logo=figma)](figma/Light.tokens.json)
[![](https://img.shields.io/badge/figma_dark-171c23.svg?logo=figma)](figma/Dark.tokens.json)

# Distributed Poimandres design-system

Try it:

```sh
cd /tmp && rm -rf pmndrs-foo && \
npx -y create-next-app@latest pmndrs-foo --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes && \
cd pmndrs-foo && \
npx -y shadcn@latest init --preset b1VlIttI --yes && \
npx -y shadcn@latest add pmndrs/docs/keypoints#v4.22.0 --yes && \
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

## Registry items

Every item, this repo's and the other pmndrs repos', linked to its source:
[the registry catalog](https://pmndrs.github.io/design-system/getting-started/introduction#registry-items).

## Reseeding (optional)

For a palette other than the pmndrs one: install `md3-base` — same plumbing, no
baked palette — and follow its docs.

```sh
npx shadcn@latest add pmndrs/design-system/md3-base#v0.8.0
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

Always pin a ref — `pmndrs/design-system/theme#v0.8.0`. Refs are **not
inherited**: every entry in `registryDependencies` carries its own.

- a shadcn primitive → `registryDependencies: ["button"]`
- shared across pmndrs blocks → its own item, by full pinned address
  (`pmndrs/docs/mdx-prose#v1.0.0`) — a bare name never means a same-repo item
- meaningful only here → another entry in the same item's `files`
- trivial _and_ app-specific → inline it

A block never hardcodes a font family (the `font-sans` / `font-mono` utilities):
it inherits the consumer's. Icons come from
`components.json`'s `iconLibrary`; `lucide` is the pmndrs baseline.

## Claude Design

The design system is published to Claude as the
[Poimandres Design System artifact](https://claude.ai/artifact/FF46zANDT1mt2kdF9D9QAf),
so that the designs Claude generates stay on brand: its tokens, its brand book
(`README.md`), its fonts, and a card per pmndrs block of the registry catalog.
The artifact draws the foundations, colours to shadows, from the tokens itself.

Every file of it comes from this repo. `npm run artifact` writes them into
`out/artifact/project/` (gitignored), laid out as the artifact's own
`project/`:

- `tokens.json`, from the theme palette, the shadcn remap and the docs tables,
  with the usage lines and provenance of `scripts/artifact.notes.json`;
- `README.md`, `assets/Logos/README.md` and `components/<Block>/*`, copied
  from `artifact/` with their `{{placeholders}}` filled: every version and sha
  in them comes from git, `package.json`, `node_modules` or
  `registry/external.json`;
- `fonts/*`, the latin subsets of Inter and Inconsolata.

`components/` mirrors the catalog's blocks (`registry:block` items of
`registry.json` and `registry/external.json`): each has a hand-written
`preview.html`, a static rendition styled with the artifact's token variables,
and a `README.md`. A block listed without its card fails the run, and so does
a card whose block left the catalog.

The artifact generates the rest itself (`tokens.css`, `manifest.json`, `api/`),
and its index, `design-system.json`, which names the logo uploads, is edited
in place.

A maintainer publishes after each release, from Claude Code, signed in to
claude.ai, which is why CI cannot do it:

1. Check out `main` at the release and run `npm run artifact`.
2. Diff `out/artifact/project/` against the artifact's files, and publish only
   the files that changed to https://claude.ai/artifact/FF46zANDT1mt2kdF9D9QAf
   with Claude Code's Artifact tool.
3. Last, update `design-system.json`'s `lastChange` (`by`, `at`, `via` naming
   the commit, `note`).

Nothing of it is committed but its sources: `scripts/artifact.mjs`,
`scripts/artifact.notes.json` and `artifact/`.

## dev

```sh
npm install
npm run build   # regenerate registry.json, figma/*.tokens.json, the docs catalog
npm run artifact  # generate the Claude Design artifact files into out/artifact/
npm run lgtm    # outputs are current and valid, preset code round-trips
npm run refresh-catalog  # re-fetch the other repos' items listed in the docs catalog
```

Docs live in `docs/` ([pmndrs/docs](https://github.com/pmndrs/docs)), deployed to
GitHub Pages on push to `main`, and to Vercel as well (a preview per pull request,
which the sidebar's version switcher links to). Preview them on http://localhost:3000:

```sh
curl -sL https://raw.githubusercontent.com/pmndrs/docs/refs/heads/main/preview.sh | MDX=docs NEXT_PUBLIC_LIBNAME=design-system sh
```
