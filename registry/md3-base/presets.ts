import type { MtbConfig } from 'material-theme-builder'
import { pmndrsMtb } from './md3.ts'

// Contrast is a viewer preference. Only Lime has designer-selected neutral seeds.
const { contrast: _contrast, neutral, neutralVariant, ...defaults } = pmndrsMtb

/** Named source seeds, with native neutral generation unless explicitly designed. */
export const themePresets = pmndrsMtb.customColors
  .filter((color) => !color.blend)
  .map(({ name, hex }) => ({
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    config: {
      ...defaults,
      source: hex,
      ...(name === 'lime' ? { neutral, neutralVariant } : {}),
    } satisfies MtbConfig,
  }))
