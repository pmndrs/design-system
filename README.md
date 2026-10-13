[![](https://img.shields.io/badge/figma_light-171c23.svg?logo=figma)](figma/Light.tokens.json)
[![](https://img.shields.io/badge/figma_dark-171c23.svg?logo=figma)](figma/Dark.tokens.json)

# Distributed Poimandres design-system

The shared pmndrs visual language: colours, typography, spacing, radius, shadows
and motion, with reusable assets. Use its documented values
and exported files across design tools and implementations.

## Design resources

Start with the [tokens](https://pmndrs.github.io/design-system/tokens/introduction).
The [SVG assets](https://pmndrs.github.io/design-system/assets/introduction) and
[design tokens](figma/) are available directly. Light and dark colours and
foundations use DTCG; text and shadow styles use Tokens Studio.

## Registry items

The registry distributes code and files. Items can target vanilla JavaScript,
Vue, React or other environments; each item carries its own files and
dependencies. Choose items according to your project and their setup requirements.

The [official shadcn registry directory](https://ui.shadcn.com/docs/directory?q=pmndrs)
lets the CLI resolve `@pmndrs` automatically, without manual registration.

Read the [JSON index](https://pmndrs.github.io/design-system/r/registry.json)
or use the shadcn CLI to browse and install individual items:

```sh
npx shadcn@latest add @pmndrs/logo @pmndrs/figma-tokens
npx shadcn@latest search @pmndrs
```

See the [registry catalog](https://pmndrs.github.io/design-system/getting-started/introduction#registry-items)
for this repo's items and blocks from other pmndrs repos.

The hosted registry follows `main`. To pin an installation, use a GitHub address
with a tag: `pmndrs/design-system/logo#v0.9.0`. Hosted previews serve their own
items, but their GitHub dependencies still resolve at the tags they declare.
The [versioning section](https://pmndrs.github.io/design-system/getting-started/introduction#versioning)
explains how item versions resolve.

## Integrations

- [INSTALL](https://pmndrs.github.io/design-system/getting-started/introduction#install): React, Vue or HTML and CSS.
- [Open in v0](https://pmndrs.github.io/design-system/getting-started/v0): import the theme through the public registry.

<details>
  <summary>Prototype in v0</summary>

To use the theme in v0:
[Open in v0](https://v0.app/chat/api/open?url=https%3A%2F%2Fpmndrs.github.io%2Fdesign-system%2Fr%2Fv0.json&title=pmndrs).

</details>


## Custom palettes

The [md3-base item](registry/md3-base/docs.md) provides the colour plumbing
without a baked palette. Follow its docs to generate a palette from your own
seed with [Material Theme Builder](https://www.npmjs.com/package/material-theme-builder).

## Publish an item

[Publish code or files](https://pmndrs.github.io/design-system/getting-started/publishing)
from the repo that owns them, then add the registry to the catalog. Each item
declares its files and dependencies; pin every dependency to its own ref.

## Storybook

Browse the supported registry components and links to the design system documentation:

```sh
pnpm run storybook        # http://localhost:6006
pnpm run build-storybook  # static output in out/storybook/
```

The documentation deployment includes Storybook at
[storybook/](https://pmndrs.github.io/design-system/storybook/). Each Vercel PR preview
serves the same build under `/design-system/storybook/`; its link is in the deployment
job summary and the PR description.

[Storybook composition](https://storybook.js.org/docs/sharing/storybook-composition)
is configured through `refs` in `.storybook/main.ts`. The `pmndrs/docs` reference
loads the remote catalog; the sidebar filter in `.storybook/manager.ts` only displays
components listed for that repository in `registry/external.json` (Color and Keypoints).
Remote stories keep their own theme, and some addons have composition limitations.
This filters sidebar navigation; remote search results and direct links can still
reach other entries in the source Storybook.

`registry/external.json` records each published Storybook's release ref, source commit
and immutable build URL. The `pmndrs/docs` preview matches `v4.22.0`. Updating a registry
ref without updating its Storybook mapping fails the build. `refresh-catalog` preserves
this metadata. Verify the published build's commit against the new release when updating
the mapping; no external build or component code is imported by the DS.

## dev

Use Node.js 24 and pnpm 10.33.4 (pinned in `package.json`).

```sh
pnpm install
pnpm run build   # regenerate registry.json, CSS and figma/*.tokens.json
pnpm run build-docs  # assemble publishable pages and assets in out/docs/
pnpm run lgtm    # outputs are current and valid, preset code round-trips
pnpm run refresh-catalog  # re-fetch the other repos' items listed in the docs catalog
```

Docs live in `docs/` ([pmndrs/docs](https://github.com/pmndrs/docs)), deployed to
GitHub Pages on push to `main`, and to Vercel as well (a preview per pull request,
which the sidebar's version switcher links to).

### Editing documentation and tokens

Edit prose, headings and examples directly in `docs/**/*.mdx`. Builds never
rewrite these files, `README.md` or `.changeset/README.md`.

- Edit shared typography, spacing, radius, shadow and motion values in
  [`foundations.json`](./foundations.json). The docs tables and Figma exports read
  the same data; headings and Markdown formatting have no effect on tokens.
- Edit colour seeds in `registry/md3-base/md3.ts` and named presets in
  `registry/md3-base/presets.ts`.
- The MDX references `<ThemePlayground />`, `<ThemePresets />`,
  `<RegistryCatalog />` and `<FoundationTable name="typography.scale" />` insert
  computed content into `out/docs/` only. Move or remove them like other content.
- `{{release}}` explicitly means the current package release, and `{{v0Url}}`
  inserts the Open in v0 URL. Literal versions and URLs stay as authored,
  including historical examples. README links are maintained explicitly.

Run `pnpm run build` after changing tokens and `pnpm run build-docs` after changing
documentation or its data. Only distribution outputs need committing; `out/` is
ignored. CI prepares the documentation before compiling the site, and edit links
still point at `docs/`.

Preview on http://localhost:3000 after preparing the pages:

```sh
pnpm run build-docs
curl -sL https://raw.githubusercontent.com/pmndrs/docs/refs/heads/main/preview.sh | MDX=out/docs NEXT_PUBLIC_LIBNAME=design-system sh
```
