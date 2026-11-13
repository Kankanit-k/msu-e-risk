// Persistence for OAuth clients, grants, tokens and pending write actions.
//
// Default: one JSON file (data/mcp-store.json, gitignored — see data/mcp-store.example.json for the
// shape). Fine for a single Node process. For PM2 cluster / several servers, implement McpStore
// against the system's real database and return it from getStore().
//
// Tokens and codes are stored as SHA-256 hashes only — a leaked file cannot be replayed.
import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { Caller, McpScope } from './types'

export type ClientRecord = {
  client_id: string
  client_name: string
  redirect_uris: string[]
  created_at: string
}

/** A user's consent for one client. Revoking it kills its access and refresh tokens. */
export type GrantRecord = {
  id: string
  clientId: string
  user: Omit<Caller, 'clientId' | 'scopes'>
  scopes: McpScope[]
  createdAt: string
  lastUsedAt?: string
  refreshHash: string
  refreshExpiresAt: string

  /** Hashes of refresh tokens already rotated out. Seeing one again means theft → revoke. */
  usedRefreshHashes: string[]
  revokedAt?: string
}

export type CodeRecord = {
  hash: string
  grantDraft: Omit<GrantRecord, 'id' | 'refreshHash' | 'refreshExpiresAt' | 'usedRefreshHashes'>
  redirectUri: string
  codeChallenge: string
  expiresAt: string
}

export type AccessTokenRecord = { hash: string; grantId: string; expiresAt: string }

export type ActionRecord = {
  id: string
  userId: string
  clientId: string
  tool: string
  args: Record<string, unknown>
  preview: string
  status: 'pending' | 'done' | 'failed' | 'cancelled'
  result?: unknown
  createdAt: string
  expiresAt: string
}

export type StoreData = {
  clients: ClientRecord[]
  grants: GrantRecord[]
  codes: CodeRecord[]
  accessTokens: AccessTokenRecord[]
  actions: ActionRecord[]
}

export interface McpStore {

  /** Read a consistent snapshot. */
  read(): Promise<StoreData>

  /** Apply a mutation atomically; returns what the mutator returns. */
  update<T>(mutate: (data: StoreData) => T): Promise<T>
}

const empty = (): StoreData => ({ clients: [], grants: [], codes: [], accessTokens: [], actions: [] })

const isExpired = (iso: string, now: number) => Date.parse(iso) <= now

// Drop anything that can no longer be used so the file stays small.
const prune = (data: StoreData) => {
  const now = Date.now()

  const liveGrantIds = new Set(
    data.grants.filter(g => !g.revokedAt && !isExpired(g.refreshExpiresAt, now)).map(g => g.id)
  )

  data.codes = data.codes.filter(c => !isExpired(c.expiresAt, now))
  data.accessTokens = data.accessTokens.filter(t => !isExpired(t.expiresAt, now) && liveGrantIds.has(t.grantId))

  // Keep revoked/expired grants for 30 days so the connections page can show what happened.
  const keepUntil = now - 30 * 24 * 3600_000

  data.grants = data.grants.filter(
    g => liveGrantIds.has(g.id) || Date.parse(g.revokedAt ?? g.refreshExpiresAt) > keepUntil
  )
  data.actions = data.actions.filter(a => Date.parse(a.expiresAt) > keepUntil)
}

class JsonFileStore implements McpStore {
  private data: StoreData | null = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private file: string) {}

  private async load(): Promise<StoreData> {
    if (this.data) return this.data

    try {
      this.data = { ...empty(), ...(JSON.parse(await fs.readFile(this.file, 'utf8')) as Partial<StoreData>) }
    } catch (err) {
      // Missing file → start empty. Corrupt file → fail closed rather than silently wiping grants.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      this.data = empty()
    }

    return this.data
  }

  async read() {
    await this.queue

    return structuredClone(await this.load())
  }

  update<T>(mutate: (data: StoreData) => T): Promise<T> {
    const run = async () => {
      const draft = structuredClone(await this.load())
      const result = mutate(draft)

      prune(draft)
      await fs.mkdir(path.dirname(this.file), { recursive: true })
      const tmp = `${this.file}.${process.pid}.tmp`

      await fs.writeFile(tmp, JSON.stringify(draft, null, 2), { mode: 0o600 })
      await fs.rename(tmp, this.file)
      this.data = draft

      return result
    }

    const next = this.queue.then(run, run)

    this.queue = next.catch(() => undefined)

    return next
  }
}

// One instance per process, even if Next loads this module more than once.
const globalStore = globalThis as unknown as { __mcpStore?: McpStore }

export const getStore = (): McpStore => {
  globalStore.__mcpStore ??= new JsonFileStore(
    process.env.MCP_STORE_FILE || path.join(process.cwd(), 'data', 'mcp-store.json')
  )

  return globalStore.__mcpStore
}
