// Next.js calls register() once per runtime at boot, and onRequestError for every
// server-side error it catches (RSC, route handlers, SSR). This is where the app-wide
// error capture is wired to the logger.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { logger, isDiscordConfigured, currentLogFiles, closeFiles } = await import('@/libs/logger')

  // Aliased so the Edge bundler doesn't flag these Node-only APIs while it
  // compiles this file for the edge runtime (the guard above skips them there).
  const proc = globalThis.process as NodeJS.Process

  const files = currentLogFiles()

  logger.info('Application started', {
    context: {
      logDir: files.dir,
      logFile: files.all,
      discordWebhook: isDiscordConfigured() ? 'configured' : 'not configured'
    },
    silent: true
  })

  proc.on('uncaughtException', error => {
    logger.fatal('Uncaught exception', { source: 'uncaught-exception', error })
  })

  proc.on('unhandledRejection', reason => {
    logger.fatal('Unhandled promise rejection', { source: 'unhandled-rejection', error: reason })
  })

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    proc.on(signal, () => {
      logger.info(`Received ${signal} — shutting down`, { silent: true })
      closeFiles()
    })
  }
}

export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string; headers?: Record<string, string | undefined> },
  context: { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string }
) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    // eslint-disable-next-line no-console
    console.error('[edge] request error', error)

    return
  }

  const { logger } = await import('@/libs/logger')

  logger.error(`Request failed: ${request.method ?? 'GET'} ${request.path ?? context.routePath ?? 'unknown'}`, {
    source: context.routeType === 'route' ? 'api' : 'server',
    error,
    context: {
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routerKind: context.routerKind,
      routeType: context.routeType,
      renderSource: context.renderSource,
      userAgent: request.headers?.['user-agent'],
      referer: request.headers?.referer
    }
  })
}
