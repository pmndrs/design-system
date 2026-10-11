The pmndrs palette as a plain CSS file, installed at `src/assets/pmndrs.css`.
It contains the same Material Design 3 colour variables as `theme`, in `:root`
and `.dark`, including the brand colours and alert roles.

Import it once in your application's stylesheet or entry point:

```ts
import './assets/pmndrs.css'
```

For a plain HTML page, link to the stylesheet at the URL your project serves it
from. Use the variables in your own CSS:

```css
body {
  background: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
}

.brand {
  background: var(--md-sys-color-lime-container);
  color: var(--md-sys-color-on-lime-container);
}
```

Add `dark` to `<html>` to switch the whole page to the dark palette. A `.dark`
ancestor can also switch a section; put it around the elements that use these
variables.

This item installs no JavaScript, fonts, shadcn configuration or Tailwind
utilities. Choose your own typography and components. In a shadcn project,
install `theme` instead if you want its token mapping and monospace font too.
