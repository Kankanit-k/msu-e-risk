// Smoke tests (tests/*.spec.ts) — run with `pnpm test:smoke` after `pnpm build`.
// Starts `next start` on SMOKE_PORT (default 3103) unless SMOKE_BASE_URL points at a running server.
import { existsSync } from 'node:fs'

import { defineConfig } from '@playwright/test'

import nextConfig from './next.config'

// The tests mint a session cookie, so they need the same NEXTAUTH_SECRET as the server.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const port = Number(process.env.SMOKE_PORT || 3103)
const origin = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '') || `http://localhost:${port}`
const basePath = nextConfig.basePath ?? ''

process.env.SMOKE_BASEPATH = basePath

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: { baseURL: origin, trace: 'retain-on-failure' },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next start -p ${port}`,
        url: `${origin}${basePath}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,

        // Route protection must be ON for the access tests, whatever .env.local says.
        // Demo mode is ON so the demo role simulator is testable. NEXT_PUBLIC_* is inlined at build
        // time, so the build that serves these tests must also run with NEXT_PUBLIC_DEMO_MODE=true (ci.yml).
        env: {
          AUTH_DISABLED: 'false',
          NEXT_PUBLIC_AUTH_DISABLED: 'false',
          NEXTAUTH_URL: `${origin}${basePath}/api/auth`,
          DEMO_MODE: 'true',
          NEXT_PUBLIC_DEMO_MODE: 'true'
        }
      }
})
