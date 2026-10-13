import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Color } from '@/registry/color/color'
import type { MtbConfig } from 'material-theme-builder'

type ThemeSeedsTableProps = {
  /** Active theme settings from the site's builder. */
  config: MtbConfig
}

/**
 * Seed table for the live website.
 * Its rendering does not require a theme provider.
 */
export function ThemeSeedsTable({ config }: ThemeSeedsTableProps) {
  const options = [
    'source',
    'colorMatch',
    'scheme',
    'primary',
    'secondary',
    'tertiary',
    'neutral',
    'neutralVariant',
    'error',
  ] as const satisfies readonly (keyof MtbConfig)[]

  return (
    <div className="mt-3 mb-8 overflow-hidden rounded-2xl border *:data-[slot=table-container]:scroll-fade-x *:data-[slot=table-container]:no-scrollbar">
      <Table aria-label="Current theme seeds">
        <TableHeader>
          <TableRow>
            <TableHead>Option</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {options.map((option) => {
            const value = config[option]
            if (value === undefined || (option === 'scheme' && config.colorMatch)) return null
            return (
              <TableRow key={option}>
                <TableCell>
                  <code className="bg-surface-container-high text-on-surface rounded-sm px-1.5 py-0.5 font-mono">
                    {option}
                  </code>
                </TableCell>
                <TableCell>
                  {typeof value === 'string' && value.startsWith('#') && <Color color={value} />}{' '}
                  <code className="bg-surface-container-high text-on-surface rounded-sm px-1.5 py-0.5 font-mono">
                    {String(value)}
                  </code>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
