---
'@pmndrs/design-system': minor
---

The poimandres shadcn preset is now `b1VlIttI` (was `b5cR4Y50S`): the preset the pmndrs docs sites were created with (pmndrs/docs#599), so the design system and the docs share one code. It moves the style from `base-nova` to `base-luma`, and theme and chartColor from `teal` to `neutral`. The colour change has no visible effect: the MD3 layer remaps every shadcn colour token. The radius scale `base-luma` writes is the same as `base-nova`'s (`--radius: 0.625rem`, multiplicative steps); the Radius, Typography and Getting Started pages now name the new style and code.
