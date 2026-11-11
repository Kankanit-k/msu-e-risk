// Type Imports
import type { LogLevel } from './types'

import { logLevels } from './types'

const bool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === '') return fallback

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)

  return Number.isFinite(parsed) ? parsed : fallback
}

const level = (value: string | undefined, fallback: LogLevel) =>
  logLevels.includes((value ?? '') as LogLevel) ? (value as LogLevel) : fallback

const isProd = process.env.NODE_ENV === 'production'

export const loggerConfig = {
  /** Master switch for file logging. */
  enabled: bool(process.env.LOG_ENABLED, true),

  /** Minimum level that gets written to disk. */
  level: level(process.env.LOG_LEVEL, isProd ? 'info' : 'debug'),

  /** Directory that holds the daily files (relative paths resolve from cwd). */
  dir: process.env.LOG_DIR || 'logs',

  /** One file per day: logs/app-YYYY-MM-DD.log — errors are mirrored to error-YYYY-MM-DD.log. */
  filePrefix: process.env.LOG_FILE_PREFIX || 'app',

  /** Timezone used for the file's date stamp and the human-readable time. */
  timezone: process.env.LOG_TIMEZONE || 'Asia/Bangkok',

  /** Delete day-files older than this. 0 disables cleanup. */
  retentionDays: int(process.env.LOG_RETENTION_DAYS, 30),

  /** Also mirror everything to stdout/stderr. */
  console: bool(process.env.LOG_CONSOLE, !isProd),

  /** Pretty (indented) JSON is easier to read by hand; NDJSON is easier to grep/ship. */
  pretty: bool(process.env.LOG_PRETTY, false),

  discord: {
    /** Paste the webhook URL here (env: DISCORD_WEBHOOK_URL) — everything else is already wired. */
    url: process.env.DISCORD_WEBHOOK_URL || '',

    enabled: bool(process.env.DISCORD_WEBHOOK_ENABLED, true),

    /** Only entries at this level or above are pushed to Discord. */
    level: level(process.env.DISCORD_WEBHOOK_LEVEL, 'error'),

    username: process.env.DISCORD_WEBHOOK_USERNAME || 'MSU App Logger',

    /** Optional role/user mention prefix for fatal alerts, e.g. "<@&123456789>". */
    mention: process.env.DISCORD_WEBHOOK_MENTION || '',

    /** Shown in the embed footer so you can tell staging from production. */
    environment: process.env.DISCORD_WEBHOOK_ENVIRONMENT || process.env.NODE_ENV || 'development',

    /** Drop repeats of the same error fingerprint within this window (ms). 0 disables. */
    dedupeWindowMs: int(process.env.DISCORD_WEBHOOK_DEDUPE_MS, 60_000),

    /** Hard cap on webhook posts per minute so Discord never rate-limits us away. */
    maxPerMinute: int(process.env.DISCORD_WEBHOOK_MAX_PER_MINUTE, 20),

    /**
     * Set to true when the webhook lives in a **forum channel**. Discord rejects a
     * forum post that has no thread, so each alert opens one (named after the error)
     * and repeats of the same error are posted back into that same thread.
     */
    forum: bool(process.env.DISCORD_WEBHOOK_FORUM, false),

    /**
     * Post every alert into one existing thread / forum post instead of opening new
     * ones. Takes precedence over `forum`. (Right-click the post → Copy Link → last id.)
     */
    threadId: process.env.DISCORD_WEBHOOK_THREAD_ID || '',

    /** Forum tag ids applied to threads we open, comma-separated. Optional. */
    tagIds: (process.env.DISCORD_WEBHOOK_TAG_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
  }
} as const

/** Keys whose values are masked before anything is written or sent. */
export const redactedKeys = [
  'password',
  'pass',
  'secret',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
  'authorization',
  'cookie',
  'set-cookie',
  'apiKey',
  'api_key',
  'client_secret',
  'clientSecret',
  'nextauth_secret'
]
