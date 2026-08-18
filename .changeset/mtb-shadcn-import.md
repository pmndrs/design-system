---
'@pmndrs/design-system': minor
---

`md3-base` is two lines pointing at the package, instead of copies of it.

Its `css` field carried the 31 declarations mapping shadcn's variables onto MD3
roles — a verbatim copy of `material-theme-builder/shadcn.css`, kept in step by
hand. It was a copy because the package's block had to land *after* shadcn's own
`:root {}` / `.dark {}`, which an `@import` cannot do. v4 doubles the selectors
(`:root:root, .dark.dark`), so it wins on specificity wherever it lands.

The Tailwind mapping moves from the stylesheet to the `@plugin` of the same
name, which arrived in 3.3.0 — after the `^3.2.0` this item asked for, hence
unavailable until now. v5 then deleted the stylesheet outright, so this is no
longer a preference between two spellings. Two things follow from it anyway.

Order stops being load-bearing. A plugin contributes theme *defaults*, so
shadcn's `@theme inline` keeps the three names they collide on — `background`,
`primary`, `secondary`. The stylesheet takes them instead when it lands after
shadcn's block, and `bg-secondary` silently stops being the container colour:
`#d3e5f5` becomes `#50606e`, and every `<Button variant="secondary">` with it.
Nothing errors. The installer happens to write the import above that block
today, which is the only reason this was not already a bug.

Custom colours stop needing hand-written CSS. They took four `@theme` lines
each — `--color-note`, `--color-on-note`, `--color-note-container`,
`--color-on-note-container` — and a forgotten line meant no rule and no error.
Now they are named where the plugin is:

```css
@plugin "material-theme-builder/tailwind" {
  custom-colors: note;
}
```

Four roles and eleven shades follow, `bg-note` through `bg-note-950`.

Nothing changes for anyone installing `md3`: same variables, same values. The
peer bump is real — `material-theme-builder` is now `^5.0.0`. The palette it
computes is byte-identical across 3.3, 4 and 5.
