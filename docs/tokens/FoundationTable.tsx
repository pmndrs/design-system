import type source from '../../foundations.json'

type FoundationTableProps = {
  /** The foundation table to display. */
  name:
    | 'typography.fonts'
    | 'typography.scale'
    | 'typography.weights'
    | 'spacing.base'
    | 'spacing.scale'
    | 'radius.scale'
    | 'shadows.box'
    | 'shadows.inset'
    | 'shadows.drop'
    | 'motion.defaults'
    | 'motion.durations'
    | 'motion.easings'
  /** Canonical values supplied by the documentation configuration. */
  foundations: typeof source
}

const code = (value: string | number) => (
  <code className="bg-surface-container-high rounded-[max(.25em,4px)] px-1.5 py-0.5 font-mono">{value}</code>
)

const utilityTable = (rows: { utility: string; variable: string | null; value: string }[]) => ({
  headers: ['Utility', 'Variable', 'Value'],
  rows: rows.map(({ utility, variable, value }) => [code(utility), variable ? code(variable) : 'none', code(value)]),
})

/**
 * Display canonical foundation values as a native table. Preview dimensions
 * use CSS values directly, so edited tokens do not depend on Tailwind finding
 * dynamically assembled utility names.
 */
export function FoundationTable({ name, foundations }: FoundationTableProps) {
  const { typography, spacing, radius, shadows, motion } = foundations
  const tables = {
    'typography.fonts': {
      headers: ['Role', 'Family', 'Utility', 'Variable'],
      rows: typography.fonts.map(({ role, family, utility, variable }) => [role, family, code(utility), code(variable)]),
    },
    'typography.scale': {
      headers: ['Utility', 'Font size', 'Line height', 'Preview'],
      rows: typography.scale.map(({ utility, fontSize, lineHeight, pixels }) => [
        code(utility),
        <>{code(fontSize)} ({pixels.fontSize}px)</>,
        <>{code(lineHeight)} ({pixels.lineHeight}px)</>,
        <span style={{ fontSize, lineHeight }}>Aa</span>,
      ]),
    },
    'typography.weights': {
      headers: ['Utility', 'Variable', 'Value', 'Preview'],
      rows: typography.weights.map(({ utility, variable, value }) => [
        code(utility), code(variable), code(value), <span style={{ fontWeight: value }}>Aa</span>,
      ]),
    },
    'spacing.base': {
      headers: ['Token', 'Value'],
      rows: [[code('--spacing'), code(spacing.base)]],
    },
    'spacing.scale': {
      headers: ['Step', 'Value', 'Pixels', 'Preview'],
      rows: spacing.scale.map(({ step, value, pixels }) => [
        code(step), code(value), pixels === 0 ? 0 : `${pixels}px`,
        <div className="h-3 bg-primary" style={{ width: value }} />,
      ]),
    },
    'radius.scale': {
      headers: ['Token', 'Utility', 'Value', 'rem', 'px'],
      rows: radius.scale.map(({ token, utility, formula, value, pixels }) => [
        code(token), code(utility), formula.startsWith('inherited') ? formula : code(formula), code(value), `${pixels}px`,
      ]),
    },
    'shadows.box': utilityTable(shadows.box),
    'shadows.inset': utilityTable(shadows.inset),
    'shadows.drop': utilityTable(shadows.drop),
    'motion.defaults': {
      headers: ['Variable', 'Value'],
      rows: motion.defaults.map(({ variable, value }) => [code(variable), code(value)]),
    },
    'motion.durations': {
      headers: ['Utility', 'Value'],
      rows: motion.durations.map(({ utility, value }) => [code(utility), code(value)]),
    },
    'motion.easings': utilityTable(motion.easings),
  }
  const table = tables[name]

  return (
    <div className="my-8 overflow-auto rounded-lg border border-outline-variant">
      <table className="bg-surface-container-low min-w-full divide-y divide-outline-variant">
        <thead className="text-foreground">
          <tr>
            {table.headers.map((header) => (
              <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="even:bg-surface">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 text-sm first:font-medium">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
