// Type Imports
import type { LogContext, SerializedError } from './types'

// Config Imports
import { loggerConfig, redactedKeys } from './config'

const redactedSet = new Set(redactedKeys.map(key => key.toLowerCase()))

const MAX_DEPTH = 6
const MAX_ARRAY = 100
const MAX_STRING = 4000

/** Deep-clone a value into something JSON-safe, masking secrets and cutting cycles. */
export const sanitize = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value

  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
  if (typeof value === 'symbol') return value.toString()

  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return serializeError(value)

  if (depth >= MAX_DEPTH) return '[Object depth limit]'

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)

    const items = value.slice(0, MAX_ARRAY).map(item => sanitize(item, depth + 1, seen))

    return value.length > MAX_ARRAY ? [...items, `…and ${value.length - MAX_ARRAY} more`] : items
  }

  if (value instanceof Map) return sanitize(Object.fromEntries(value), depth, seen)
  if (value instanceof Set) return sanitize([...value], depth, seen)

  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[Circular]'
    seen.add(value as object)

    const out: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactedSet.has(key.toLowerCase()) ? '[redacted]' : sanitize(item, depth + 1, seen)
    }

    return out
  }

  return String(value)
}

export const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: (error as Error & { digest?: string }).digest,
      cause: cause === undefined ? undefined : cause instanceof Error ? serializeError(cause) : String(cause)
    }
  }

  if (typeof error === 'object' && error !== null) {
    const shape = error as Record<string, unknown>

    return {
      name: typeof shape.name === 'string' ? shape.name : 'Error',
      message: typeof shape.message === 'string' ? shape.message : JSON.stringify(sanitize(error)),
      stack: typeof shape.stack === 'string' ? shape.stack : undefined,
      digest: typeof shape.digest === 'string' ? shape.digest : undefined
    }
  }

  return { name: 'Error', message: String(error) }
}

export const sanitizeContext = (context?: LogContext) => (context ? (sanitize(context) as LogContext) : undefined)

/** YYYY-MM-DD in the configured timezone — this is what names the day's file. */
export const dateStamp = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: loggerConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)

/** Human-readable local time kept alongside the ISO timestamp. */
export const localTime = (date = new Date()) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: loggerConfig.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
