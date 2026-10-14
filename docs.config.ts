import type { DocsConfig } from '@pmndrs/docs/src/config'
import scopeConfig from './docs.scope'
import { ThemeSeeds } from './docs/ThemeSeeds'

export default {
  ...scopeConfig,
  components: { ThemeSeeds },
} satisfies DocsConfig
