// Tiny JSON-file table for services that have no database yet (data/<name>.json, gitignored).
// Writes are serialized within this process and land atomically (tmp file + rename).
// Fine for one Node process; move to the real backend before production.
import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

export const jsonStore = <T>(name: string) => {
  const file = path.join(process.cwd(), 'data', `${name}.json`)
  const g = globalThis as unknown as Record<string, Promise<unknown> | undefined>
  const queueKey = `__jsonStore_${name}`

  const load = async (): Promise<T[]> => {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8')) as T[]
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw err // corrupt file → fail loudly rather than overwrite it
    }
  }

  const mutate = <R>(fn: (rows: T[]) => R): Promise<R> => {
    const run = async () => {
      const rows = await load()
      const result = fn(rows)

      await fs.mkdir(path.dirname(file), { recursive: true })
      const tmp = `${file}.${process.pid}.tmp`

      await fs.writeFile(tmp, JSON.stringify(rows, null, 2), { mode: 0o600 })
      await fs.rename(tmp, file)

      return result
    }

    const next = (g[queueKey] ?? Promise.resolve()).then(run, run)

    g[queueKey] = next.catch(() => undefined)

    return next
  }

  return { load, mutate }
}

/** A rule broken by the caller — routes answer with `status` and this (Thai) message. */
export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}
