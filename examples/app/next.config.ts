import type { NextConfig } from 'next'

export default {
  // Next writes AGENTS.md and CLAUDE.md on first run. This app is a fixture; its
  // instructions are the repo's.
  agentRules: false,
} satisfies NextConfig
