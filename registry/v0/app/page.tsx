'use client'

import Image from 'next/image'
import { useState } from 'react'

/**
 * The seven brand colours, each as its container role with the role meant to
 * go on it: the container is the brand hex itself. `bg-lime` and the other
 * bare names are a darker tone in light, for text and icons.
 */
const brandColours = [
  { name: 'lime', className: 'bg-lime-container text-on-lime-container' },
  { name: 'teal', className: 'bg-teal-container text-on-teal-container' },
  { name: 'cyan', className: 'bg-cyan-container text-on-cyan-container' },
  { name: 'purple', className: 'bg-purple-container text-on-purple-container' },
  { name: 'red', className: 'bg-red-container text-on-red-container' },
  { name: 'orange', className: 'bg-orange-container text-on-orange-container' },
  { name: 'yellow', className: 'bg-yellow-container text-on-yellow-container' },
]

/**
 * A starter that shows the pmndrs theme as it lands: the logo, the brand
 * colours, the type and the dark scheme. Every colour is a token from
 * `app/globals.css`, never a hex.
 */
export default function Page() {
  const [dark, setDark] = useState(false)

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 p-8">
      <header className="flex items-center justify-between gap-4">
        <Image src="/pmndrs/logo_complete.svg" alt="pmndrs" width={64} height={64} className="rounded-lg" />
        <button
          type="button"
          onClick={() => setDark(document.documentElement.classList.toggle('dark'))}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {dark ? 'Light' : 'Dark'}
        </button>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="text-5xl font-semibold tracking-tight">pmndrs design system</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Material Design 3 colour roles on top of shadcn, seeded with the poimandres lime. Set in Inter, with{' '}
          <code className="rounded-sm bg-muted px-1 text-sm font-semibold">Inconsolata</code> for code.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {brandColours.map(({ name, className }) => (
          <div key={name} className={`flex aspect-square items-end rounded-xl p-3 text-sm font-medium ${className}`}>
            {name}
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-primary-container p-6 text-on-primary-container">primary-container</div>
        <div className="rounded-xl bg-surface-container-high p-6 text-on-surface">surface-container-high</div>
        <div className="rounded-xl border border-border bg-card p-6 text-card-foreground">card</div>
      </section>
    </main>
  )
}
