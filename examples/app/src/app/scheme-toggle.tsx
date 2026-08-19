'use client'

/**
 * No `next-themes` here on purpose: the point is to flip `.dark` on `<html>` and
 * watch the palette follow, not to persist a preference.
 */
export function SchemeToggle() {
  return (
    <button
      data-testid="scheme-toggle"
      className="border-outline text-on-surface-variant rounded-md border px-3 py-1 text-sm"
      onClick={() => document.documentElement.classList.toggle('dark')}
    >
      Toggle dark
    </button>
  )
}
