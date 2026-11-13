// This module touches the filesystem — it must only ever be imported from the Node.js runtime.
import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Type Imports
import type { LogEntry } from './types'

// Config Imports
import { loggerConfig } from './config'
import { dateStamp } from './serialize'

type Handles = {
  stamp: string
  all: fs.WriteStream
  error: fs.WriteStream
}

let handles: Handles | null = null
let cleanupStamp = ''
let disabledReason = ''

const resolveDir = () =>
  path.isAbsolute(loggerConfig.dir) ? loggerConfig.dir : path.join(process.cwd(), loggerConfig.dir)

const openStream = (dir: string, name: string) =>
  fs.createWriteStream(path.join(dir, name), { flags: 'a', encoding: 'utf8' })

/** Remove day-files older than LOG_RETENTION_DAYS. Runs at most once per day-roll. */
const cleanup = (dir: string) => {
  if (loggerConfig.retentionDays <= 0) return

  const cutoff = Date.now() - loggerConfig.retentionDays * 24 * 60 * 60 * 1000

  try {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.log')) continue

      const stat = fs.statSync(path.join(dir, file))

      if (stat.mtimeMs < cutoff) fs.unlinkSync(path.join(dir, file))
    }
  } catch {
    // Housekeeping is best-effort — never let it break logging.
  }
}

const handlesFor = (stamp: string): Handles | null => {
  if (disabledReason) return null
  if (handles && handles.stamp === stamp) return handles

  try {
    const dir = resolveDir()

    fs.mkdirSync(dir, { recursive: true })

    handles?.all.end()
    handles?.error.end()

    handles = {
      stamp,
      all: openStream(dir, `${loggerConfig.filePrefix}-${stamp}.log`),
      error: openStream(dir, `error-${stamp}.log`)
    }

    // Swallow late stream errors (disk full, permissions) instead of crashing the app.
    handles.all.on('error', () => {})
    handles.error.on('error', () => {})

    if (cleanupStamp !== stamp) {
      cleanupStamp = stamp
      cleanup(dir)
    }

    return handles
  } catch (err) {
    disabledReason = err instanceof Error ? err.message : String(err)

    // eslint-disable-next-line no-console
    console.error(`[logger] file logging disabled: ${disabledReason}`)

    return null
  }
}

export const hostname = (() => {
  try {
    return os.hostname()
  } catch {
    return undefined
  }
})()

/** Append one entry to today's file (and to the error file for error/fatal). */
export const writeToFile = (entry: LogEntry) => {
  if (!loggerConfig.enabled) return

  const target = handlesFor(dateStamp(new Date(entry.timestamp)))

  if (!target) return

  const line = `${loggerConfig.pretty ? JSON.stringify(entry, null, 2) : JSON.stringify(entry)}\n`

  target.all.write(line)

  if (entry.level === 'error' || entry.level === 'fatal') target.error.write(line)
}

/** Flush open streams — used by the process-exit hooks. */
export const closeFiles = () => {
  handles?.all.end()
  handles?.error.end()
  handles = null
}

export const currentLogFiles = () => {
  const stamp = dateStamp()
  const dir = resolveDir()

  return {
    dir,
    all: path.join(dir, `${loggerConfig.filePrefix}-${stamp}.log`),
    error: path.join(dir, `error-${stamp}.log`)
  }
}
