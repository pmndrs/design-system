import { playwright } from '@vitest/browser-playwright'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * A real browser, because the failure this repo has to catch is a token that
 * resolves to nothing — and that is a cascade question. jsdom computes no
 * colours, and reading the compiled stylesheet instead would miss the ordering
 * bugs (`@plugin` against `@theme inline`, `:root:root` against `:root`) that are
 * most of the risk here.
 */
export default defineConfig({
  // The installed seed reads `process.env.THEME_*`, which is a build-time
  // substitution everywhere it normally runs. Substituting it here too is what
  // makes the test see the pmndrs defaults rather than crash on `process`.
  define: { 'process.env': '({})' },
  optimizeDeps: { include: ['react/jsx-dev-runtime'] },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
