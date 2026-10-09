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

### Namespace

The docs site also serves this repo's items as static JSON, rebuilt from `registry.json`
on every deploy of `main` (`npm run hosted-registry` writes the same files into `public/r/`).
Declare the [namespace](https://ui.shadcn.com/docs/registry/namespace) in `components.json`:

```json
{
  "registries": {
    "@pmndrs": "https://pmndrs.github.io/design-system/r/{name}.json"
  }
}
```

then `npx shadcn@latest add @pmndrs/theme`. It serves the latest state of `main`; the git
address at a tag (`pmndrs/design-system/theme#v0.9.0`) stays the pinned one. A branch's
preview deployment serves its own `r/`, but `preset`'s dependency on `theme` is that tagged
git address, so it resolves to the released tag, not to the branch. The
[shadcn MCP server](https://ui.shadcn.com/docs/mcp) (`npx shadcn@latest mcp init --client claude`)
reads the same namespace to list and install the items.

To start a fresh project from it, init with `preset`: the poimandres preset and the theme in
one item, no preset code, and the namespace declared on the way.

```sh
npx shadcn@latest init https://pmndrs.github.io/design-system/r/preset.json
```

To prototype in v0 with the pmndrs colours, fonts and radius already applied:
[Open in v0](https://v0.app/chat/api/open?url=https%3A%2F%2Fpmndrs.github.io%2Fdesign-system%2Fr%2Fv0.json&title=pmndrs).
Or have v0 build the brand guidelines from it, as slides:
[brand guidelines in v0](https://v0.app/chat/api/open?url=https%3A%2F%2Fpmndrs.github.io%2Fdesign-system%2Fr%2Fv0.json&title=pmndrs+brand+guidelines&prompt=pmndrs+brand+guidelines%2C+16%3A9+slides%2C+strict+editorial+grid%2C+layout+inspired+by+https%3A%2F%2Fmir-s3-cdn-cf.behance.net%2Fprojects%2F808%2Fbc1589229031299.Y3JvcCwxNjgzLDEzMTYsMCww.jpg%2C+not+its+colours.+Follow+guidelines%2FGuidelines.md.+app%2Fglobals.css+is+the+palette%3A+never+edit%2C+no+hex%3B+brand+lime+%3D+bg-lime-container+%2B+text-on-lime-container.+Not+the+Poimandres+VS+Code+theme.+Light%2Fdark+toggle.+Cover%3A+%2Fpmndrs%2Flogo_complete.svg.+Then%3A+foreword%2C+logo%2C+colour%2C+type%2C+spacing%2C+radius%2C+icons%2C+components%2C+voice.).
Both open the `v0` item: a starter page, the logo, `guidelines/Guidelines.md` and a
`globals.css` with the colours resolved, under the utility names a pmndrs project has
(`bg-primary-container`, `bg-lime-container`), so what v0 writes runs unchanged in one.

## Reseeding (optional)

For a palette other than the pmndrs one: install `md3-base` — same plumbing, no
baked palette — and follow its docs.

```sh
npx shadcn@latest add pmndrs/design-system/md3-base#v0.9.0
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

Always pin a ref — `pmndrs/design-system/theme#v0.9.0`. Refs are **not
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
  `registry/external.json`. `README.md` is the brand book, which
  `npm run build` also turns into the docs site's
  [Guidelines](https://pmndrs.github.io/design-system/guidelines/introduction)
  page and the `guidelines` item's `Guidelines.md`: passages that only make
  sense in the artifact sit between `<!-- artifact-only -->` and
  `<!-- /artifact-only -->`, and stay out of those two;
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
