import type { DocsConfig } from '@pmndrs/docs/src/config'
import scopeConfig from './docs.scope'
import { ThemeSeedsStatic } from './docs/ThemeSeeds.table'

export default {
  ...scopeConfig,
  components: { ThemeSeeds: ThemeSeedsStatic },
} satisfies DocsConfig
