import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'pmndrs',
  description: 'Built with the pmndrs design system.',
}

/**
 * The fonts come from `globals.css` (Inter as `font-sans`, Inconsolata as
 * `font-mono` on `code`), and the dark scheme is the `dark` class on `<html>`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
