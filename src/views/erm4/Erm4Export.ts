// ERM4 Word export: one round of one risk factor — measure results, KPI / KRIs results, level at the round and
// attachments, next to the ERM3 plan they report on.
import { downloadWord, escapeHtml, textToHtml } from '@/libs/export/word'
import type { Erm3Record, Indicator, IndicatorKind } from '@/services/erm3Types'
import { achieved, measureStatus, roundLabel } from '@/services/erm4Types'
import type { Erm4Record, Round } from '@/services/erm4Types'

import { contextLines } from '../erm2/Erm2Report'
import type { ReportContext } from '../erm2/Erm2Report'
import { indicatorHtml, levelHtml, measuresHtml } from '../erm3/Erm3Report'

export const ERM4_TITLE = 'ERM4 : รายงานผลการดำเนินงานตามแผนบริหารจัดการความเสี่ยง'

const p = (html: string, style = '') => `<p style="margin:0;${style}">${html}</p>`

const resultHtml = (i: Indicator, kind: IndicatorKind, rec?: Erm4Record) => {
  const r = rec?.[kind][i.id]
  const ok = achieved(i, r?.value)

  return (
    indicatorHtml(i, kind) +
    p(`ผลการดำเนินงาน : <b>${r?.value === undefined ? '- N/A -' : escapeHtml(`${r.value} ${i.unit}`)}</b>`) +
    p(`การบรรลุเป้าหมาย : <b style="color:${ok ? '#1b7a3a' : '#c62828'}">${ok ? 'บรรลุ' : 'ไม่บรรลุ'}</b>`) +
    (r?.detail ? p(textToHtml(r.detail), 'margin:2pt 0 8pt') : p('', 'margin-bottom:8pt'))
  )
}

export const exportErm4Word = (
  plan: Erm3Record,
  rec: Erm4Record | undefined,
  round: Round,
  c: ReportContext & { factor: string }
) => {
  const headings = [
    'ผลการดำเนินงานตามมาตรการ/แผนงาน/โครงการ/กิจกรรมจัดการความเสี่ยง',
    'ผลการดำเนินงานตามตัวชี้วัด KPI',
    'ผลการดำเนินงานตามตัวชี้วัด KRIs',
    `ระดับความเสี่ยง ณ ${roundLabel(round)}`,
    'เอกสารแนบ'
  ]

  const measureExtra = (id: string) => {
    const r = rec?.measures[id]

    return (
      p(`ร้อยละ ${r?.percent ?? '-'} · ${measureStatus(r).label}`, 'margin-left:16pt;color:#555') +
      (r?.result ? p(textToHtml(r.result), 'margin:0 0 4pt 16pt') : '')
    )
  }

  const attachments =
    [
      ...(rec?.links ?? []).map(l => `${escapeHtml(l.label || l.url)} — ${escapeHtml(l.url)}`),
      ...(rec?.files ?? []).map(f => escapeHtml(f.name))
    ]
      .map((t, i) => p(`${i + 1}. ${t}`))
      .join('') || '-'

  const cells = [
    measuresHtml(plan.measures, m => measureExtra(m.id)),
    plan.kpis.map(i => resultHtml(i, 'kpis', rec)).join('') || '-',
    plan.kris.map(i => resultHtml(i, 'kris', rec)).join('') || '-',
    levelHtml(rec?.level ?? {}, `ระดับความเสี่ยง ณ ${roundLabel(round)}`),
    attachments
  ]

  downloadWord(
    `ERM4 ${roundLabel(round)} ${c.unit} ${c.year} ${c.factor.slice(0, 60)}`,
    `<h1>${escapeHtml(`${ERM4_TITLE} ${roundLabel(round)}`)}</h1>
${[...contextLines(c), `ความเสี่ยง: ${c.risk}`, `ปัจจัยเสี่ยง: ${c.factor}`].map(l => `<p class="meta">${escapeHtml(l)}</p>`).join('')}
<table><thead><tr>${headings.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody><tr>${cells.map(x => `<td>${x}</td>`).join('')}</tr></tbody></table>`,
    { landscape: true }
  )
}
