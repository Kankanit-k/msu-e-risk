'use client'

// Browser-side logger. It never touches the filesystem — entries are POSTed to
// /api/log, where the server logger writes them to the day's file and alerts Discord.

// Type Imports
import type { LogContext, LogLevel, LogSource } from './types'

type ClientPayload = {
  level: LogLevel
  source: LogSource
  message: string
  context?: LogContext
  error?: { name: string; message: string; stack?: string; digest?: string }
  page?: { url: string; referrer: string; userAgent: string }
}

// NEXT_PUBLIC_BASEPATH may be a full URL (http://host/digitalplan) — we only want the path part,
// because fetch/sendBeacon are not rewritten by Next's basePath. Trailing slash matches
// `trailingSlash: true` in next.config.ts so the POST is not 308-redirected.
const basePath = (process.env.NEXT_PUBLIC_BASEPATH ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '')

const endpoint = `${basePath}/api/log/`

const toError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: (error as Error & { digest?: string }).digest
    }
  }

  if (error === undefined) return undefined

  return { name: 'Error', message: typeof error === 'string' ? error : JSON.stringify(error) }
}

const send = (payload: ClientPayload) => {
  if (typeof window === 'undefined') return

  const body = JSON.stringify({
    ...payload,
    page: {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    }
  })

  try {
    // sendBeacon survives page unload, which is exactly when crashes happen.
    if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'application/json' }))) return
  } catch {
    // fall through to fetch
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  }).catch(() => {
    // Reporting must never throw inside the app.
  })
}

const emit =
  (level: LogLevel) =>
  (message: string, options: { context?: LogContext; error?: unknown; source?: LogSource } = {}) =>
    send({
      level,
      source: options.source ?? 'client',
      message,
      context: options.context,
      error: toError(options.error)
    })

export const clientLogger = {
  debug: emit('debug'),
  info: emit('info'),
  warn: emit('warn'),
  error: emit('error'),
  fatal: emit('fatal')
}

let installed = false

/** Capture window.onerror + unhandled promise rejections. Installed once by <ErrorReporter />. */
export const installGlobalErrorHandlers = () => {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  const onError = (event: ErrorEvent) => {
    clientLogger.error(event.message || 'Uncaught error', {
      source: 'uncaught-exception',
      error: event.error ?? event.message,
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno }
    })
  }

  const onRejection = (event: PromiseRejectionEvent) => {
    clientLogger.error('Unhandled promise rejection', {
      source: 'unhandled-rejection',
      error: event.reason
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    installed = false
  }
}
