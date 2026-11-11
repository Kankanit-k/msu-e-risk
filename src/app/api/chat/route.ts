// In-app chatbot endpoint. Session-cookie auth; the LLM key never leaves the server.
import { clientIp, rateLimit } from '@/libs/rateLimit'
import { logger } from '@/libs/logger'
import { isSameOrigin, sessionCaller } from '@/mcp/auth'
import { urls } from '@/mcp/config'
import { chat, isLlmConfigured } from '@/mcp/llm'
import type { ChatTurn } from '@/mcp/llm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async () => Response.json({ configured: isLlmConfigured() })

export const POST = async (req: Request) => {
  if (!isSameOrigin(req)) return Response.json({ error: 'bad origin' }, { status: 403 })

  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })
  if (!rateLimit(`chat:${caller.userId}:${clientIp(req)}`, Number(process.env.LLM_MAX_PER_MINUTE || 20)))
    return Response.json({ error: 'ส่งข้อความถี่เกินไป รอสักครู่' }, { status: 429 })
  if (!isLlmConfigured()) return Response.json({ error: 'ยังไม่ได้ตั้งค่า AI ของระบบ (LLM_API_KEY)' }, { status: 503 })

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null

  // Keep only well-formed text turns, the last 20, each capped — the client is not trusted.
  const history: ChatTurn[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(
      (m): m is ChatTurn =>
        !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length > 0
    )
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))

  if (history.at(-1)?.role !== 'user') return Response.json({ error: 'ไม่มีข้อความ' }, { status: 400 })

  try {
    return Response.json(await chat(caller, history, urls(req).action))
  } catch (error) {
    logger.error('in-app chat failed', { source: 'mcp', error, context: { userId: caller.userId } })

    return Response.json({ error: 'ผู้ช่วย AI ไม่ตอบสนองในขณะนี้ ลองใหม่อีกครั้ง' }, { status: 502 })
  }
}
