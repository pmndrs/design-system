/**
 * Reads back, from a rendered page, the colours the registry says it installed.
 *
 * This is the check the repo has no other way to run. `registry validate` never
 * parses TSX, Tailwind emits neither a rule nor an error for a utility it does
 * not know, and `next build` is green either way — a missing token renders as
 * nothing at all, silently.
 *
 * The expected values come from the seed *this app was given*, `@/lib/md3`,
 * recomputed here through the same package: nothing is asserted against a hex
 * typed into this file, so reseeding needs no edit here, and a palette that
 * changed without the app's CSS following still fails.
 */
import { Panel } from '@/components/panel'
import { pmndrsMtb } from '@/lib/md3'
import { builder } from 'material-theme-builder'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'
import './globals.css'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { source, ...options } = pmndrsMtb
const emitted = builder(source, options).toCss()

/** `toCss()` emits one flat `:root` and one flat `.dark`. */
const blocks = Object.fromEntries(
  [...emitted.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => [
    selector.trim(),
    Object.fromEntries(
      body
        .split(';')
        .filter((declaration) => declaration.includes(':'))
        .map((declaration) => {
          const colon = declaration.indexOf(':')
          return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]
        })
    ),
  ])
)

/**
 * Roles are aliases onto tonal shades (`var(--md-ref-palette-neutral-98)`), and
 * `.dark` restates only what differs from `:root`, so both need one hop through
 * the light block.
 */
function role(name: string, scheme: ':root' | '.dark') {
  const read = (variable: string) => blocks[scheme][variable] ?? blocks[':root'][variable]
  const value = read(`--md-sys-color-${name}`)
  const hex = value.startsWith('var(') ? read(value.slice(4, -1)) : value
  const [, r, g, b] = /#(\w\w)(\w\w)(\w\w)/.exec(hex)!
  return `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`
}

function render() {
  const host = document.createElement('div')
  host.className = 'bg-background'
  document.body.append(host)

  act(() => {
    createRoot(host).render(<Panel title="Panel" />)
  })

  const at = (testid: string) => document.querySelector(`[data-testid="${testid}"]`)!
  return {
    background: getComputedStyle(host).backgroundColor,
    panel: getComputedStyle(at('panel')).backgroundColor,
    title: getComputedStyle(at('panel-title')).color,
    button: getComputedStyle(at('panel-button')).backgroundColor,
  }
}

afterEach(() => {
  document.body.replaceChildren()
  document.documentElement.classList.remove('dark')
})

test.for([':root', '.dark'] as const)('the panel renders the pmndrs palette in %s', (scheme) => {
  document.documentElement.classList.toggle('dark', scheme === '.dark')

  expect(render()).toEqual({
    // An MD3 role shadcn has no equivalent for: it is here only because `md3`
    // resolved through the block's dependency.
    panel: role('surface-dim', scheme),
    title: role('on-surface-variant', scheme),
    // Stock shadcn tokens, on a stock shadcn component — the remap has to reach
    // these too, or `md3` is additive only and the two layers disagree.
    background: role('background', scheme),
    button: role('primary', scheme),
  })
})
