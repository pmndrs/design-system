Four SVG files, in `public/pmndrs/` at the root of your project: `logo_complete`, `logo_idle`, `logo_animated` and `logo_loading`. Your app serves them as they are:

```tsx
<img src="/pmndrs/logo_loading.svg" width={48} height={48} alt="Loading" />
```

- **The animations are CSS inside the file.** A plain `<img>` plays them, and so does `next/image` with `unoptimized`. Under reduced motion, `logo_animated` shows the complete mark, and `logo_loading` only fades.
- **Every file paints its own black square**, 600×600. There is no transparent variant yet.
- **PNGs are not included**: the registry carries text files only. Download them from the Assets page of the docs.

MIT, like the rest of pmndrs/design-system. No attribution required.
