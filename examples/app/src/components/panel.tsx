import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

/**
 * Every class here is load-bearing, and each stands for a different way the
 * colour layer can fail:
 *
 *   bg-surface-dim           an MD3 role shadcn has no equivalent for — it is
 *                            here only because `md3` resolved
 *   bg-primary, via <Button> a stock shadcn token, and a stock shadcn component
 *                            rendering on it, after the MD3 remap took it over
 *   text-on-surface-variant  an MD3 text role
 *   border-border            a stock token the remap leaves alone
 *
 * None of them reports anything when it goes missing: Tailwind emits no rule and
 * no error for an unknown utility, so the panel just renders transparent. That
 * is what `tokens.test.tsx` is for — it reads the computed colour back.
 */
export function Panel({
  title = 'Panel',
  children,
  className,
  ...props
}: { title?: string } & ComponentProps<'section'>) {
  return (
    <section
      data-testid="panel"
      className={cn('bg-surface-dim border-border rounded-xl border p-6', className)}
      {...props}
    >
      <h2 data-testid="panel-title" className="text-on-surface-variant mb-4 text-xl font-bold">
        {title}
      </h2>

      <ul className="ms-6 list-disc text-sm">{children}</ul>

      <Button data-testid="panel-button" className="mt-6">
        Primary
      </Button>
    </section>
  )
}

export function PanelItem(props: ComponentProps<'li'>) {
  return <li className="my-1" {...props} />
}
