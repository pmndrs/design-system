**This item ships no colours.** It is the plumbing: two lines of CSS pointing at the package — its Tailwind plugin, and the stylesheet remapping shadcn's variables onto MD3 roles — plus `lib/md3.ts`, the pmndrs seed.

Install it alone only if you compute the palette yourself. If you just want pmndrs colours, install `md3` instead — it adds a baked palette on top of this and needs nothing mounted.

Nothing renders until something defines `--md-sys-color-*`, and it does not fail gracefully: the remap here overrides the *stock* shadcn variables, so an undefined palette takes `--background`, `--primary` and `--border` down with it, silently — no error from Tailwind, none from the browser.

Emit it from a React Server Component. `builder` is the root export and carries no `'use client'`, so no palette code reaches the browser:

```tsx
import { builder } from 'material-theme-builder'
import { pmndrsMtb } from '@/lib/md3'

const { source, ...rest } = pmndrsMtb
const css = builder(source, rest).toCss()
// <style dangerouslySetInnerHTML={{ __html: css }} /> in <head>
```

That repeats the palette in every document — around 32 kB raw, but 2 kB brotli, since it is all hex declarations. Only worth hoisting into your stylesheet with a build step if you have measured that it matters; the build step costs a generated file and an import-order rule that fails silently whenever your seed matches the baked default.

Computed here, the palette is the baked `md3` one, colour for colour: both are `builder(pmndrsMtb)`.

`<Mtb>` from `material-theme-builder/react` does the same as a client component. Avoid it in an app that renders on the server, but it is the right tool where there is no build to hook — a Storybook preview decorator, for instance. With `next-themes`, nest `<ThemeProvider>` inside it, not around it.

The seed ships seven custom colours, the brand ones: `lime`, `teal`, `cyan`, `purple`, `red`, `orange` and `yellow`, and `md3` bakes their roles. Their utilities are not automatic: the `@plugin` line this item added to your CSS is installed in statement form (`@plugin '...';`), and the registry cannot give it a body, so give it one yourself:

```css
@plugin "material-theme-builder/tailwind" {
  custom-colors: lime, teal, cyan, purple, red, orange, yellow;
}
```

Need a colour M3 has no role for? Spread `pmndrsMtb` into your own config and add `customColors` there, rather than editing the installed file — `blend: true` harmonizes them against the pmndrs seed, and `...pmndrsMtb.customColors` keeps the seven above. Then add yours to the same body, `custom-colors: lime, teal, cyan, purple, red, orange, yellow, note;`.

Four roles and eleven shades follow per colour — `bg-note`, `text-on-note`, `bg-note-container`, `text-on-note-container`, `bg-note-50` … `bg-note-950`. Nothing else to write.
