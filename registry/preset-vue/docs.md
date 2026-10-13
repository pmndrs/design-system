Start a Vue project with the pmndrs colours, fonts and radius already configured:

```sh
npx shadcn-vue@latest init --preset https://pmndrs.github.io/design-system/r/preset-vue.json --template vite --name my-app
```

Use `--preset` with this URL so shadcn-vue applies the item's configuration.
It chooses `reka-luma`, Lucide icons and the `@pmndrs` registry namespace, and
installs Inter and Inconsolata through Fontsource.

The palette is the same light and dark Material Design 3 palette as `theme`.
Use stock shadcn tokens such as `bg-background` and `text-primary`, or MD3 roles
such as `bg-surface-dim` and `text-on-surface-variant`. Brand and alert utilities
are ready too: `bg-lime-container`, `text-on-warning-container`, `bg-purple-500`.
Add `dark` to `<html>` or an ancestor to switch schemes.

Add Vue components through shadcn-vue:

```sh
cd my-app
npx shadcn-vue@latest add button
```

Apply the preset to an existing shadcn-vue project:

```sh
npx shadcn-vue@latest apply --preset https://pmndrs.github.io/design-system/r/preset-vue.json
```

This reapplies the preset to existing components, fonts and CSS.
It installs no React components or palette runtime. The hosted URL follows `main`; the plain `palette` item is available
when you only need CSS variables, without shadcn-vue or Tailwind.
