// Log levels, ordered from least to most severe.
export const logLevels = ['debug', 'info', 'warn', 'error', 'fatal'] as const

export type LogLevel = (typeof logLevels)[number]

export const logLevelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
}

// Where the entry came from — useful when grepping a day's file.
export type LogSource =
  | 'server'
  | 'client'
  | 'api'
  | 'auth'
  | 'middleware'
  | 'react'
  | 'mcp'
  | 'unhandled-rejection'
  | 'uncaught-exception'

export type LogContext = Record<string, unknown>

export type SerializedError = {
  name: string
  message: string
  stack?: string
  cause?: SerializedError | string
  digest?: string
}

export type LogEntry = {

  /** ISO-8601 with milliseconds, always UTC-safe. */
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string

  /** Correlates every entry produced while handling one request. */
  requestId?: string
  context?: LogContext
  error?: SerializedError

  /** Runtime metadata attached to every entry. */
  meta: {
    env: string
    pid?: number
    hostname?: string
    runtime: 'nodejs' | 'edge' | 'browser'
  }
}
