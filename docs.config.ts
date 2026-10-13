import type { DocsConfig } from '@pmndrs/docs/src/config'
import fragmentConfig from './docs.config.fragment'
import { ThemeSeeds } from './docs/ThemeSeeds'

export default {
  ...fragmentConfig,
  components: { ThemeSeeds },
} satisfies DocsConfig
