The item an "Open in v0" link opens: a v0 chat whose project already has the pmndrs colours, fonts and radius.

- **One file, `app/globals.css`.** v0 ignores `css` and `cssVars`, so the theme travels as the stylesheet of the v0 project, overwriting the default one.
- **shadcn's names only.** `--background`, `--primary`, `--border` and the rest are the pmndrs palette resolved to literal colours, light and dark, which is what v0 generates with. The MD3 roles (`bg-surface-dim` and the others) are not in it.
- **Not for your own project.** There, install `theme` or `preset`: the palette stays computed from the seed, and the MD3 roles come with it.
