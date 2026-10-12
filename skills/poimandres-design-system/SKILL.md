---
name: poimandres-design-system
description: Apply the Poimandres (pmndrs) design system to interfaces, slides, documents and other visual artifacts when pmndrs branding or design guidelines are requested.
license: MIT
---

# Poimandres design system

Style the requested artifact with the shared pmndrs visual language. This is
the collective's design system; the Poimandres editor theme is a separate project.

Read [references/guidelines.md](references/guidelines.md) before styling. It is
the canonical brand book, bundled at this skill's release: colour roles and
pairings, typography, spacing, radii, components, logos and voice.

## Interfaces

Work with the project's existing framework. The guidelines describe shadcn
integration; they also apply to vanilla CSS and other frameworks. Reuse an
installed pmndrs theme when present. For a standalone HTML artifact, import
[assets/palette.css](assets/palette.css) and use its MD3 role variables; it
contains no font loading, shadcn aliases or Tailwind utilities.

Use the theme's semantic roles for fills and their matching foregrounds.
The guidelines explain why the lime container, rather than `primary`, supplies
the visible brand lime. Preserve the requested light or dark scheme; when
both schemes are supported, check both.

## Slides, documents and images

Translate the guidelines into the output format's native styling. For formats
that require literal RGB values, resolve the chosen role from the bundled
palette rather than inventing a colour. Start with `:root`; in dark mode,
overlay `.dark` and follow `var(...)` aliases until they resolve to a literal.
Keep the fill and foreground from the same scheme.

Set headings and body text in Inter and code in Inconsolata. If the output
cannot embed or load those fonts, use an available sans-serif or monospace
fallback and disclose the substitution. The bundle contains no font binaries.
Translate the spacing and radius proportions into the document's units;
Tailwind utilities in the guidelines describe a scale, not a required toolchain.

## Logo assets

Use [assets/logo_complete.svg](assets/logo_complete.svg) as the mark, or
[assets/logo_idle.svg](assets/logo_idle.svg) for its resting state. Preserve
the whole square, including its black background, and its aspect ratio.
Embed the supplied SVG or convert it as required by the output format.

## Finish

Check the artifact against the brand book: semantic colour pairs, typography,
spacing, logo integrity and voice. Distinguish inherited Tailwind defaults
from pmndrs decisions. If the user requests a visual treatment beyond the
documented system, describe it as a choice for that artifact.

The [documentation](https://pmndrs.github.io/design-system/) follows `main`;
the bundled resources stay with the installed skill's version. Use the bundle
for reproducible styling, and consult the site when the user asks for the latest
guidelines or registry catalog.
