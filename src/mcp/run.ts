// The single entry point for running a tool — used by /api/mcp (B/C) and /api/chat (A).
// Enforces role + scope, validates input, turns writes into pending actions, and audits.
import 'server-only'

import { z } from 'zod'

import { accessLevelRank } from '@/configs/accessControl'
import { audit as auditTrail } from '@/libs/audit'
import { logger } from '@/libs/logger'

import { tools } from './registry'
import { getStore } from './store'
import type { ActionRecord } from './store'
import { TTL, inFuture } from './config'
import type { Caller, ToolDef, ToolOutcome } from './types'

export const canUse = (caller: Caller, tool: ToolDef) =>
  accessLevelRank[caller.role] >= accessLevelRank[tool.minRole] &&
  caller.scopes.includes(tool.kind === 'write' ? 'mcp:write' : 'mcp:read')

export const toolsFor = (caller: Caller) => tools.filter(t => canUse(caller, t))

const audit = (caller: Caller, tool: string, outcome: string, startedAt: number, extra: Record<string, unknown> = {}) =>
  logger.info(`mcp tool ${tool}: ${outcome}`, {
    source: 'mcp',
    context: {
      audit: true,
      userId: caller.userId,
      role: caller.role,
      clientId: caller.clientId,
      tool,
      outcome,
      ms: Date.now() - startedAt,
      ...extra
    }
  })

export const runTool = async (
  caller: Caller,
  name: string,
  rawArgs: unknown,
  actionUrl: (id: string) => string
): Promise<ToolOutcome> => {
  const startedAt = Date.now()
  const tool = tools.find(t => t.name === name)

  // Unknown and not-allowed look the same to the caller: don't reveal what exists.
  if (!tool || !canUse(caller, tool)) {
    audit(caller, name, 'denied', startedAt)

    return { status: 'denied', message: 'ไม่มี tool นี้ หรือคุณไม่มีสิทธิ์ใช้' }
  }

  const parsed = z.object(tool.input).strict().safeParse(rawArgs ?? {})

  if (!parsed.success) {
    audit(caller, name, 'invalid', startedAt)

    return { status: 'invalid', message: z.prettifyError(parsed.error) }
  }

  try {
    if (tool.kind === 'read') {
      const data = await tool.handler(caller, parsed.data)

      audit(caller, name, 'ok', startedAt)

      return { status: 'ok', data }
    }

    // Write: never execute here. Park it until the user confirms in the system's own UI.
    const preview = tool.preview ? await tool.preview(caller, parsed.data) : `เรียก ${tool.title}`

    const action: ActionRecord = {
      id: crypto.randomUUID(),
      userId: caller.userId,
      clientId: caller.clientId,
      tool: tool.name,
      args: parsed.data,
      preview,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: inFuture(TTL.action)
    }

    const accepted = await getStore().update(d => {
      if (d.actions.filter(a => a.userId === caller.userId && a.status === 'pending' && Date.parse(a.expiresAt) > Date.now()).length >= TTL.pendingActionsPerUser)
        return false
      d.actions.push(action)

      return true
    })

    if (!accepted) return { status: 'denied', message: 'มีรายการรอยืนยันค้างอยู่มากเกินไป กรุณายืนยันหรือยกเลิกรายการเดิมก่อน' }
    audit(caller, name, 'pending-confirmation', startedAt, { actionId: action.id })

    return { status: 'confirm', actionId: action.id, preview, confirmUrl: actionUrl(action.id), expiresAt: action.expiresAt }
  } catch (error) {
    logger.error(`mcp tool ${name} failed`, { source: 'mcp', error, context: { userId: caller.userId, tool: name } })

    return { status: 'error', message: 'เกิดข้อผิดพลาดในระบบ' }
  }
}

/**
 * Execute a pending action. Called only from cookie-authenticated, same-origin requests made by a
 * human (confirm card in the chat widget, or the /actions/[id] page) — never by a model.
 */
export const confirmAction = async (caller: Caller, id: string, decision: 'confirm' | 'cancel') => {
  const startedAt = Date.now()

  // Claim it atomically so a double click can't run it twice.
  const action = await getStore().update(d => {
    const a = d.actions.find(x => x.id === id)

    if (!a || a.userId !== caller.userId || a.status !== 'pending' || Date.parse(a.expiresAt) <= Date.now()) return null
    a.status = decision === 'cancel' ? 'cancelled' : 'done'

    return structuredClone(a)
  })

  if (!action) return { ok: false as const, message: 'ไม่พบรายการ รายการหมดอายุ หรือถูกดำเนินการไปแล้ว' }

  if (decision === 'cancel') {
    audit(caller, action.tool, 'cancelled', startedAt, { actionId: id })

    return { ok: true as const, cancelled: true }
  }

  const tool = tools.find(t => t.name === action.tool)

  // Re-check permissions at execution time — role or registry may have changed since.
  if (!tool || accessLevelRank[caller.role] < accessLevelRank[tool.minRole]) {
    await getStore().update(d => void (d.actions.find(x => x.id === id)!.status = 'failed'))
    audit(caller, action.tool, 'denied', startedAt, { actionId: id })

    return { ok: false as const, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้แล้ว' }
  }

  try {
    const result = await tool.handler({ ...caller, clientId: action.clientId }, action.args)

    await getStore().update(d => void (d.actions.find(x => x.id === id)!.result = result))
    audit(caller, action.tool, 'executed', startedAt, { actionId: id, via: action.clientId })
    await auditTrail({ actor: caller.userId, action: `mcp.${action.tool}`, target: id, after: { args: action.args, result } })

    return { ok: true as const, result }
  } catch (error) {
    await getStore().update(d => void (d.actions.find(x => x.id === id)!.status = 'failed'))
    await auditTrail({ actor: caller.userId, action: `mcp.${action.tool}.failed`, target: id, after: { args: action.args } })
    logger.error(`mcp action ${action.tool} failed`, { source: 'mcp', error, context: { actionId: id } })

    return { ok: false as const, message: 'ดำเนินการไม่สำเร็จ' }
  }
}

/** Plain-text rendering of an outcome for MCP clients and the chat model. */
export const outcomeText = (o: ToolOutcome) => {
  if (o.status === 'ok') return JSON.stringify(o.data)
  if (o.status === 'confirm')
    return (
      `ยังไม่ได้ดำเนินการ ต้องให้ผู้ใช้ยืนยันเองก่อน: ${o.preview}\n` +
      `ให้แจ้งผู้ใช้เปิดลิงก์นี้เพื่อตรวจสอบและกดยืนยันภายใน 10 นาที: ${o.confirmUrl}\n` +
      `ห้ามบอกผู้ใช้ว่าดำเนินการเสร็จแล้ว`
    )

  return o.message
}
