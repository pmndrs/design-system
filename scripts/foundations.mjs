/**
 * Shared foundation values live in the editable `foundations.json` source.
 * Documentation and Figma tokens consume those values;
 * editorial headings, prose and examples never determine generated tokens.
 */
import { readFileSync } from 'node:fs'

/**
 * Read the canonical foundation values. A fresh read also lets a caller build
 * from an edited source without restarting its process.
 *
 * @param {URL} source - The structured foundation source to read.
 */
export function readFoundations(source = new URL('../foundations.json', import.meta.url)) {
  return JSON.parse(readFileSync(source, 'utf8'))
}

/**
 * Rewrite modern RGB functions into the comma-separated form accepted by
 * Tokens Studio.
 *
 * @param {string} css - CSS containing RGB colour functions.
 */
export const commaRgba = (css) => css.replace(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/g, 'rgba($1, $2, $3, $4)')

const code = (value) => `\`${value}\``
const table = (headers, rows) =>
  [headers, headers.map(() => '---'), ...rows].map((cells) => `| ${cells.join(' | ')} |`).join('\n')

/**
 * Render foundation references for the published docs. Stable keys match
 * the references in editable MDX, independently of its headings or order.
 *
 * @param {ReturnType<typeof readFoundations>} foundations - Canonical foundation values.
 */
export function foundationTables(foundations) {
  const { typography, spacing, radius, shadows, motion } = foundations
  const utilityTable = (rows) => table(['Utility', 'Variable', 'Value'], rows.map(({ utility, variable, value }) => [code(utility), variable ? code(variable) : 'none', code(value)]))
  return {
    'typography.fonts': table(['Role', 'Family', 'Utility', 'Variable'], typography.fonts.map(({ role, family, utility, variable }) => [role, family, code(utility), code(variable)])),
    'typography.scale': table(['Utility', 'Font size', 'Line height', 'Preview'], typography.scale.map(({ utility, fontSize, lineHeight, pixels }) => [code(utility), `${code(fontSize)} (${pixels.fontSize}px)`, `${code(lineHeight)} (${pixels.lineHeight}px)`, `<span className="${utility}">Aa</span>`])),
    'typography.weights': table(['Utility', 'Variable', 'Value', 'Preview'], typography.weights.map(({ utility, variable, value }) => [code(utility), code(variable), code(value), `<span className="${utility}">Aa</span>`])),
    'spacing.base': table(['Token', 'Value'], [[code('--spacing'), code(spacing.base)]]),
    'spacing.scale': table(['Step', 'Value', 'Pixels', 'Preview'], spacing.scale.map(({ step, value, pixels }) => [code(step), code(value), pixels === 0 ? 0 : `${pixels}px`, `<div className="h-3 w-${step} bg-primary" />`])),
    'radius.base': `\`\`\`css\n:root {\n  --radius: ${radius.base}; /* ${parseFloat(radius.base) * 16}px at a 16px root */\n}\n\`\`\``,
    'radius.scale': table(['Token', 'Utility', 'Value', 'rem', 'px'], radius.scale.map(({ token, utility, formula, value, pixels }) => [code(token), code(utility), formula.startsWith('inherited') ? formula : code(formula), code(value), `${pixels}px`])),
    'shadows.box': utilityTable(shadows.box),
    'shadows.inset': utilityTable(shadows.inset),
    'shadows.drop': utilityTable(shadows.drop),
    'motion.defaults': table(['Variable', 'Value'], motion.defaults.map(({ variable, value }) => [code(variable), code(value)])),
    'motion.durations': table(['Utility', 'Value'], motion.durations.map(({ utility, value }) => [code(utility), code(value)])),
    'motion.easings': utilityTable(motion.easings),
  }
}
