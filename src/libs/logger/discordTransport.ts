// Type Imports
import type { LogEntry, LogLevel } from './types'

// Config Imports
import { loggerConfig } from './config'
import { logLevelRank } from './types'
import { localTime } from './serialize'

const colors: Record<LogLevel, number> = {
  debug: 0x9e9e9e,
  info: 0x2196f3,
  warn: 0xffa000,
  error: 0xe53935,
  fatal: 0x8e24aa
}

const icons: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  fatal: '🔥'
}

// In-memory dedupe + rate limiting. Per process, which is what we want:
// each instance protects the webhook on its own.
const lastSeen = new Map<string, number>()
let windowStart = 0
let windowCount = 0
let suppressed = 0

const fingerprint = (entry: LogEntry) =>
  [entry.level, entry.source, entry.error?.name ?? '', entry.error?.message ?? entry.message].join('|')

const shouldSend = (entry: LogEntry) => {
  const { discord } = loggerConfig

  if (!discord.enabled || !discord.url) return false
  if (logLevelRank[entry.level] < logLevelRank[discord.level]) return false

  const now = Date.now()

  if (discord.dedupeWindowMs > 0) {
    const key = fingerprint(entry)
    const seen = lastSeen.get(key)

    if (seen && now - seen < discord.dedupeWindowMs) return false

    lastSeen.set(key, now)

    // Keep the dedupe map from growing without bound.
    if (lastSeen.size > 500) {
      for (const [key, at] of lastSeen) {
        if (now - at > discord.dedupeWindowMs) lastSeen.delete(key)
      }
    }
  }

  if (now - windowStart > 60_000) {
    windowStart = now
    windowCount = 0
    suppressed = 0
  }

  if (windowCount >= discord.maxPerMinute) {
    suppressed += 1

    return false
  }

  windowCount += 1

  return true
}

const clamp = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

const codeBlock = (value: string, max: number) => '```\n' + clamp(value, max - 8) + '\n```'

// Forum channels need every message to live in a thread. We remember which thread we
// opened for each error fingerprint so repeats land in the same post instead of
// flooding the channel with near-identical threads.
const threads = new Map<string, string>()

const rememberThread = (key: string, id: string) => {
  threads.set(key, id)

  // Oldest-first eviction — the map is a convenience cache, not a source of truth.
  if (threads.size > 200) threads.delete(threads.keys().next().value as string)
}

/** Forum post title: readable at a glance in the channel list, max 100 chars. */
const threadName = (entry: LogEntry) => {
  const label = entry.error ? `${entry.error.name}: ${entry.error.message}` : entry.message

  return clamp(`${icons[entry.level]} [${loggerConfig.discord.environment}] ${label}`, 100)
}

/**
 * Where this alert goes. Discord takes an existing thread as the `thread_id` query
 * param, but a NEW forum post is opened by putting `thread_name` in the body — so
 * this returns both the URL and the extra body fields.
 */
const target = (entry: LogEntry, key: string) => {
  const { discord } = loggerConfig
  const url = new URL(discord.url)

  // An explicit thread wins: everything goes into that one post.
  const existing = discord.threadId || (discord.forum ? threads.get(key) : '')

  if (existing) {
    url.searchParams.set('thread_id', existing)

    return { url: url.toString(), body: {}, opensThread: false }
  }

  if (!discord.forum) return { url: url.toString(), body: {}, opensThread: false }

  // wait=true makes Discord return the message it created; its channel_id IS the
  // new thread's id, which we cache so repeats of this error reply into the post.
  url.searchParams.set('wait', 'true')

  return {
    url: url.toString(),
    body: {
      thread_name: threadName(entry),
      ...(discord.tagIds.length > 0 ? { applied_tags: discord.tagIds } : {})
    },
    opensThread: true
  }
}

const buildPayload = (entry: LogEntry) => {
  const { discord } = loggerConfig

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: 'Level', value: `${icons[entry.level]} ${entry.level.toUpperCase()}`, inline: true },
    { name: 'Source', value: entry.source, inline: true },
    { name: 'Env', value: discord.environment, inline: true }
  ]

  if (entry.requestId) fields.push({ name: 'Request ID', value: `\`${entry.requestId}\``, inline: true })

  if (entry.meta.hostname) fields.push({ name: 'Host', value: entry.meta.hostname, inline: true })

  fields.push({
    name: 'Time',
    value: `${localTime(new Date(entry.timestamp))} (${loggerConfig.timezone})`,
    inline: true
  })

  if (entry.error?.message) {
    fields.push({ name: 'Error', value: clamp(`**${entry.error.name}**: ${entry.error.message}`, 1024) })
  }

  if (entry.error?.stack) fields.push({ name: 'Stack', value: codeBlock(entry.error.stack, 1024) })

  if (entry.context && Object.keys(entry.context).length > 0) {
    fields.push({ name: 'Context', value: codeBlock(JSON.stringify(entry.context, null, 2), 1024) })
  }

  if (suppressed > 0) {
    fields.push({ name: 'Suppressed', value: `${suppressed} alert(s) rate-limited in this window` })
  }

  const mention = entry.level === 'fatal' && discord.mention ? `${discord.mention} ` : ''

  return {
    username: discord.username,
    content: clamp(`${mention}${icons[entry.level]} **${entry.level.toUpperCase()}** — ${entry.message}`, 2000),
    embeds: [
      {
        title: clamp(entry.message, 256),
        color: colors[entry.level],
        timestamp: entry.timestamp,
        fields,
        footer: { text: `${discord.environment} • ${entry.meta.runtime}` }
      }
    ]
  }
}

const post = async (url: string, key: string, payload: unknown, opensThread: boolean, attempt = 0): Promise<void> => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    // Honour Discord's own back-off once, then give up quietly.
    if (res.status === 429 && attempt < 2) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '1')

      await new Promise(resolve => setTimeout(resolve, Math.min(retryAfter * 1000 || 1000, 5000)))

      return post(url, key, payload, opensThread, attempt + 1)
    }

    if (!res.ok && res.status !== 429) {
      const detail = await res.text().catch(() => '')

      // The remembered thread is gone (deleted/archived) — forget it so the next
      // alert opens a fresh forum post instead of failing forever.
      if (res.status === 404) threads.delete(key)

      // eslint-disable-next-line no-console
      console.error(
        `[logger] discord webhook rejected the alert (HTTP ${res.status})${detail ? ` — ${detail.slice(0, 300)}` : ''}` +
          (res.status === 400 && !loggerConfig.discord.forum
            ? ' — ถ้า webhook อยู่ใน forum channel ให้ตั้ง DISCORD_WEBHOOK_FORUM=true'
            : '')
      )

      return
    }

    // Opened a forum post — remember its thread so repeats of this error reply into it.
    if (res.ok && opensThread) {
      const message = (await res.json().catch(() => null)) as { channel_id?: string } | null

      if (message?.channel_id) rememberThread(key, message.channel_id)
    }
  } catch (err) {
    // Never let alerting failures escalate — just note it locally.
    // eslint-disable-next-line no-console
    console.error('[logger] discord webhook failed:', err instanceof Error ? err.message : err)
  }
}

/** Fire-and-forget: the caller never awaits, so logging stays synchronous. */
export const sendToDiscord = (entry: LogEntry) => {
  if (!shouldSend(entry)) return

  const key = fingerprint(entry)
  const { url, body, opensThread } = target(entry, key)

  void post(url, key, { ...buildPayload(entry), ...body }, opensThread)
}

export const isDiscordConfigured = () => Boolean(loggerConfig.discord.url && loggerConfig.discord.enabled)
