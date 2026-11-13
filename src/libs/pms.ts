// PMS (ระบบบริหารแผน) client — reads the SO and goals (เป้าประสงค์) already entered in PMS so users
// can pick them here instead of typing them again.
//
// Set PMS_API_URL (+ PMS_API_TOKEN) in .env to use the real PMS. The endpoints and field names below
// are assumptions until the PMS team confirms them: adjust `get` paths and the `to*` mappers only.
// Without PMS_API_URL the functions return sample data (marked `mock: true`) so the flow can be tried.
import 'server-only'

import { logger } from '@/libs/logger'
import type { StrategyMode } from '@/services/strategyTypes'

/** PMS unreachable or answered with an error — shown to the user as a 502. */
export class PmsError extends Error {}

export type PmsSoRaw = { pmsId: string; code: string; name: string }
export type PmsGoalRaw = PmsSoRaw & { soPmsId: string; soCode: string }

export const strategyMode = (): StrategyMode => {
  const m = process.env.STRATEGY_SOURCE

  return m === 'pms' || m === 'manual' ? m : 'both'
}

export const pmsConfigured = () => !!process.env.PMS_API_URL

const str = (...v: unknown[]) => String(v.find(x => x !== undefined && x !== null) ?? '')

const toSo = (x: Record<string, unknown>): PmsSoRaw => ({
  pmsId: str(x.id, x.so_id, x.code),
  code: str(x.code, x.so_code),
  name: str(x.name, x.so_name)
})

const toGoal = (x: Record<string, unknown>): PmsGoalRaw => ({
  pmsId: str(x.id, x.goal_id, x.code),
  code: str(x.code, x.goal_code),
  name: str(x.name, x.goal_name),
  soPmsId: str(x.so_id, x.soId),
  soCode: str(x.so_code, x.soCode)
})

// Sample = the university-level SO of the old e-Risk system (FY 2569) and a few goals under them.
const SAMPLE_SO: PmsSoRaw[] = [
  ['SO1', 'จัดการศึกษาสอดคล้องกับความต้องการของสากล'],
  ['SO2', 'ผลิตงานวิจัยและนวัตกรรมเพื่อความเป็นเลิศในระดับนานาชาติ'],
  ['SO3', 'ให้บริการวิชาการเพื่อยกระดับชุมชนและสังคมนำไปสู่การพัฒนาอย่างยั่งยืน'],
  ['SO4', 'ทำนุบำรุงศิลปวัฒนธรรมอีสาน ให้มีความโดดเด่นระดับนานาชาติ'],
  ['SO5', 'ปฏิรูปการบริหารจัดการ (Management Reform)'],
  ['SO6', 'บริหารองค์กรเพื่อความเป็นมหาวิทยาลัยอัจฉริยะ (Smart University)']
].map(([code, name]) => ({ pmsId: `sample-${code}`, code, name }))

const SAMPLE_GOALS: PmsGoalRaw[] = [
  ['SO1', '1.1', 'เพิ่มประสิทธิภาพการบริหารจัดการกระบวนการวางแผน'],
  ['SO1', '1.2', 'บริหารจัดการข้อมูลสารสนเทศ เพื่อสนับสนุนการบริหารจัดการและการตัดสินใจ'],
  ['SO2', '2.1', 'เพิ่มผลงานวิจัยที่ได้รับการตีพิมพ์ในระดับนานาชาติ'],
  ['SO5', '5.1', 'ปรับปรุงกระบวนการทำงานให้กระชับและรวดเร็ว']
].map(([soCode, code, name]) => ({ pmsId: `sample-goal-${code}`, code, name, soPmsId: `sample-${soCode}`, soCode }))

const get = async (pathAndQuery: string, context: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
  const url = `${process.env.PMS_API_URL!.replace(/\/+$/, '')}${pathAndQuery}`

  const res = await fetch(url, {
    headers: process.env.PMS_API_TOKEN ? { Authorization: `Bearer ${process.env.PMS_API_TOKEN}` } : {},
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000)
  }).catch(err => {
    logger.error('PMS unreachable', { error: err, context })
    throw new PmsError('เชื่อมต่อระบบ PMS ไม่ได้ ลองใหม่อีกครั้ง')
  })

  if (!res.ok) {
    logger.error('PMS request failed', { context: { ...context, status: res.status } })
    throw new PmsError(`ระบบ PMS ตอบกลับผิดพลาด (HTTP ${res.status})`)
  }

  const body = (await res.json()) as unknown

  return (Array.isArray(body) ? body : ((body as { items?: unknown[] })?.items ?? [])) as Record<string, unknown>[]
}

const q = (year: number, unit: string) => `year=${year}&unit=${encodeURIComponent(unit)}`

export const fetchPmsSo = async (year: number, unit: string) =>
  pmsConfigured()
    ? {
        items: (await get(`/so?${q(year, unit)}`, { what: 'so', year, unit })).map(toSo).filter(x => x.code && x.name),
        mock: false
      }
    : { items: SAMPLE_SO, mock: true }

export const fetchPmsGoals = async (year: number, unit: string) =>
  pmsConfigured()
    ? {
        items: (await get(`/goals?${q(year, unit)}`, { what: 'goals', year, unit }))
          .map(toGoal)
          .filter(x => x.code && x.name),
        mock: false
      }
    : { items: SAMPLE_GOALS, mock: true }
