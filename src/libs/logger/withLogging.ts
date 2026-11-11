import 'server-only'

// Next Imports
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Logger Imports
import { logger } from './index'
import type { Logger } from './index'

type Handler<T> = (req: NextRequest, ctx: T & { log: Logger; requestId: string }) => Promise<Response> | Response

const newRequestId = () =>
  globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/**
 * Wrap a route handler so every request is logged (start, finish, duration) and any
 * thrown error is captured, written to the day's file and pushed to Discord.
 *
 * ```ts
 * export const GET = withLogging(async (req, { log }) => {
 *   log.info('fetching users')
 *   return NextResponse.json(await getUsers())
 * })
 * ```
 */
export const withLogging =
  <T extends Record<string, unknown>>(handler: Handler<T>) =>
  async (req: NextRequest, ctx: T): Promise<Response> => {
    const requestId = req.headers.get('x-request-id') || newRequestId()
    const startedAt = Date.now()

    const log = logger.child({
      source: 'api',
      requestId,
      context: {
        method: req.method,
        path: req.nextUrl.pathname,
        query: Object.fromEntries(req.nextUrl.searchParams),
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: req.headers.get('user-agent')
      }
    })

    log.debug('Request started')

    try {
      const res = await handler(req, { ...ctx, log, requestId })
      const duration = Date.now() - startedAt

      log[res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info'](
        `Request completed (${res.status}) in ${duration}ms`,
        { context: { status: res.status, durationMs: duration } }
      )

      res.headers.set('x-request-id', requestId)

      return res
    } catch (error) {
      const duration = Date.now() - startedAt

      log.error('Request threw an unhandled error', { error, context: { durationMs: duration } })

      return NextResponse.json(
        { ok: false, error: 'Internal Server Error', requestId },
        { status: 500, headers: { 'x-request-id': requestId } }
      )
    }
  }
