// Server-side logger: every entry goes to a daily file, and anything at
// DISCORD_WEBHOOK_LEVEL or above is also pushed to the Discord webhook.
//
// Client components must NOT import this — use `@/libs/logger/client` instead,
// which ships the entry to /api/log. Middleware runs on the edge runtime and has
// no filesystem, so it uses the client helper's fetch path as well.
import 'server-only'

// Type Imports
import type { LogContext, LogEntry, LogLevel, LogSource } from './types'

// Config Imports
import { loggerConfig } from './config'
import { logLevelRank } from './types'
import { hostname, writeToFile, closeFiles, currentLogFiles } from './fileTransport'
import { sendToDiscord, isDiscordConfigured } from './discordTransport'
import { localTime, sanitizeContext, serializeError } from './serialize'

export type LogOptions = {
  source?: LogSource
  requestId?: string
  context?: LogContext
  error?: unknown

  /** Skip the Discord alert for this one entry (still written to the file). */
  silent?: boolean
}

const runtime = (): LogEntry['meta']['runtime'] => (process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'nodejs')

const consoleFor = (level: LogLevel) => {
  if (level === 'error' || level === 'fatal') return console.error
  if (level === 'warn') return console.warn
  if (level === 'debug') return console.debug

  return console.info
}

const emit = (level: LogLevel, message: string, options: LogOptions = {}, base: LogOptions = {}) => {
  if (logLevelRank[level] < logLevelRank[loggerConfig.level]) return

  const now = new Date()

  const entry: LogEntry = {
    timestamp: now.toISOString(),
    level,
    source: options.source ?? base.source ?? 'server',
    message,
    requestId: options.requestId ?? base.requestId,
    context: sanitizeContext({ ...base.context, ...options.context, localTime: localTime(now) }),
    error: options.error === undefined ? undefined : serializeError(options.error),
    meta: {
      env: process.env.NODE_ENV ?? 'development',
      pid: typeof process !== 'undefined' ? process.pid : undefined,
      hostname,
      runtime: runtime()
    }
  }

  if (runtime() === 'nodejs') writeToFile(entry)

  if (loggerConfig.console) {
    consoleFor(level)(
      `[${localTime(now)}] ${level.toUpperCase()} (${entry.source})${entry.requestId ? ` [${entry.requestId}]` : ''} ${message}`,
      entry.error?.stack ?? entry.error?.message ?? ''
    )
  }

  if (!options.silent) sendToDiscord(entry)
}

const build = (base: LogOptions) => ({
  debug: (message: string, options?: LogOptions) => emit('debug', message, options, base),
  info: (message: string, options?: LogOptions) => emit('info', message, options, base),
  warn: (message: string, options?: LogOptions) => emit('warn', message, options, base),
  error: (message: string, options?: LogOptions) => emit('error', message, options, base),
  fatal: (message: string, options?: LogOptions) => emit('fatal', message, options, base),

  /** Pre-bind a source/requestId/context to every entry, e.g. per API request. */
  child: (extra: LogOptions) =>
    build({
      ...base,
      ...extra,
      context: { ...base.context, ...extra.context }
    })
})

export const logger = build({})

export type Logger = ReturnType<typeof build>

export { currentLogFiles, isDiscordConfigured, closeFiles }
export { loggerConfig } from './config'
export * from './types'
