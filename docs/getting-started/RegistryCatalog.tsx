import type { catalogEntries } from '../../scripts/catalog.mjs'

type RegistryCatalogProps = {
  /** Registry entries in their authored order. */
  rows: ReturnType<typeof catalogEntries>
}

/**
 * Show installable registry items using the documentation site's table styling.
 */
export function RegistryCatalog({ rows }: RegistryCatalogProps) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border">
      <div className="relative w-full overflow-x-auto scroll-fade-x no-scrollbar">
        <table className="w-full caption-bottom text-sm" aria-label="Registry catalog">
          <thead className="[&_tr]:border-b">
            <tr>
              <th scope="col" className="h-12 px-3 text-left align-middle font-medium text-foreground">Item</th>
              <th scope="col" className="h-12 px-3 text-left align-middle font-medium text-foreground">Description</th>
              <th scope="col" className="h-12 px-3 text-left align-middle font-medium text-foreground">Install address</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {rows.map(({ name, href, description, address }) => (
              <tr key={address} className="border-b transition-colors hover:bg-muted/50">
                <td className="p-3 align-middle">
                  <a href={href} className="text-primary underline underline-offset-3 hover:decoration-2">
                    {name}
                  </a>
                </td>
                <td className="p-3 align-middle">{description}</td>
                <td className="p-3 align-middle">
                  <code className="bg-surface-container-high text-on-surface rounded-sm px-1.5 py-0.5 font-mono">
                    {address}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
