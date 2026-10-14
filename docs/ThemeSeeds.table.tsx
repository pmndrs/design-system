import type { MtbConfig } from 'material-theme-builder'

type ThemeSeedsTableProps = {
  /** Active theme settings from the site's builder. */
  config: MtbConfig
}

/**
 * Seed table for the website's active theme.
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
      <div data-slot="table-container" className="relative w-full overflow-x-auto">
        <table data-slot="table" className="w-full caption-bottom text-sm" aria-label="Current theme seeds">
          <thead data-slot="table-header" className="[&_tr]:border-b">
            <tr data-slot="table-row" className="border-b transition-colors hover:bg-muted/50">
              <th
                scope="col"
                data-slot="table-head"
                className="h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground"
              >
                Option
              </th>
              <th
                scope="col"
                data-slot="table-head"
                className="h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground"
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
            {options.map((option) => {
              const value = config[option]
              if (value === undefined || (option === 'scheme' && config.colorMatch)) return null
              return (
                <tr key={option} data-slot="table-row" className="border-b transition-colors hover:bg-muted/50">
                  <td data-slot="table-cell" className="p-3 align-middle whitespace-nowrap">
                    <code className="bg-surface-container-high text-on-surface rounded-sm px-1.5 py-0.5 font-mono">
                      {option}
                    </code>
                  </td>
                  <td data-slot="table-cell" className="p-3 align-middle whitespace-nowrap">
                    {typeof value === 'string' && value.startsWith('#') && (
                      <span
                        aria-hidden="true"
                        data-slot="color"
                        className="inline-block size-5 rounded-full border align-middle leading-none"
                        style={{ backgroundColor: value }}
                      />
                    )}{' '}
                    <code className="bg-surface-container-high text-on-surface rounded-sm px-1.5 py-0.5 font-mono">
                      {String(value)}
                    </code>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
