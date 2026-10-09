A titled panel listing the main points an article covers, one bullet per `KeypointsItem`. It usually sits right after the intro.

Keypoints is the first pmndrs block, born in `pmndrs/docs`, the generator behind the documentation sites of the pmndrs libraries.

## Install

```sh
npx shadcn@latest add pmndrs/docs/keypoints#{{docsRef}}
```

The block is released at the `{{docsRef}}` tag of `pmndrs/docs`. The add pulls the colour layer with it, still pinned under its name before {{themeRename}}: `{{keypointsColourLayer}}`. In a new app, the pmndrs theme today is `pmndrs/design-system/theme#{{release}}`.

## Use

```tsx
import { Keypoints, KeypointsItem } from "@/components/keypoints"

<Keypoints title="What you'll learn">
  <KeypointsItem>First item</KeypointsItem>
  <KeypointsItem>Second item</KeypointsItem>
</Keypoints>
```

## What you provide

- `title` (optional string, default `"Keypoints"`): the panel heading.
- `children`: `KeypointsItem` elements, one per point. Each takes any `<li>` prop and inline content.
- Any `<section>` prop, `className` included, on `Keypoints`.

## Rules

- Use it once per article, after the intro, for three to five takeaways. Do not use it as a generic callout or card.
- Keep each item to one line where possible.
- The panel sits on `md-sys-color-surface-dim`, the one MD3 role it reaches for; everything else is stock shadcn (`border`, `foreground`). Without the colour layer (`theme`, or `md3` before {{themeRename}}) the panel has no background at all, and Tailwind reports nothing.
- It has its own vertical margin (`spacing-8` above and below); do not wrap it in extra spacing.

The preview is a static rendition: plain markup styled with this system's tokens, hand-written from `registry/keypoints/keypoints.tsx` at `pmndrs/docs@{{docsRef}}`, not the built component.
