import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'pmndrs design system — example consumer',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className="bg-background text-foreground min-h-screen">{children}</body>
    </html>
  )
}
