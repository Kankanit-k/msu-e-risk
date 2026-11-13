'use client'

// ERM3 report (แผนบริหารจัดการความเสี่ยง): 5 columns — measures, KPI, Leading KRIs, expected level, period + owners.
// Stacks on phones. MeasureOutline and IndicatorCard are reused by the ERM4 editor.
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Lib Imports
import { downloadWord, escapeHtml, textToHtml } from '@/libs/export/word'
import { ratingText, scoreText } from '@/services/erm2Types'
import { CONTROL_KINDS, INDICATOR_KINDS, outlineOf, periodText, targetText } from '@/services/erm3Types'
import type { Erm3Record, Indicator, IndicatorKind, Measure } from '@/services/erm3Types'

import { LevelCell, contextLines, matrixHtml } from '../erm2/Erm2Report'
import type { ReportContext } from '../erm2/Erm2Report'

export const ERM3_TITLE = 'ERM3 : แผนบริหารจัดการความเสี่ยง (Risk Management Plan)'
export const EXPECTED_LABEL = 'ระดับความเสี่ยงที่คาดหวัง'

export const REPORT3_HEADINGS = [
  'มาตรการ/แผนงาน/โครงการ/กิจกรรมจัดการความเสี่ยง (Addition Risk Treatment)',
  INDICATOR_KINDS.kpis.title,
  INDICATOR_KINDS.kris.title,
  'ระดับความเสี่ยงที่คาดหวังตามมาตรการ',
  'ระยะเวลาดำเนินการ / ผู้รับผิดชอบ'
]

const Heading = ({ children }: { children: ReactNode }) => (
  <Typography variant='body2' sx={{ fontWeight: 600, textDecoration: 'underline', mt: 1 }}>
    {children}
  </Typography>
)

const None = () => (
  <Typography variant='body2' color='text.disabled' sx={{ paddingInlineStart: 2 }}>
    ยังไม่ได้กรอก
  </Typography>
)

/** Measures under their control kind; only "measure" rows are numbered. `extra` renders after each measure. */
export const MeasureOutline = ({ measures, extra }: { measures: Measure[]; extra?: (m: Measure) => ReactNode }) => (
  <>
    {CONTROL_KINDS.map(c => {
      const items = outlineOf(measures, c.key)

      return (
        <Box key={c.key} sx={{ mb: 2 }}>
          <Heading>{c.label}</Heading>
          {items.length === 0 && <None />}
          {items.map(m => (
            <Box key={m.id} sx={{ paddingInlineStart: 2 + m.indent * 2, py: 0.5 }}>
              <Typography variant='body2' sx={{ fontWeight: m.type === 'measure' ? 400 : 600 }}>
                {m.no ? `${m.no}. ` : ''}
                {m.text}
              </Typography>
              {m.type === 'measure' && extra?.(m)}
            </Box>
          ))}
        </Box>
      )
    })}
  </>
)

/** One KPI/KRI: name, 5-level criteria table, target and detail. */
export const IndicatorCard = ({ i, kind, compact }: { i: Indicator; kind: IndicatorKind; compact?: boolean }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant='body2' sx={{ fontWeight: 600 }}>
      {i.name}
    </Typography>
    <Box
      component='table'
      sx={{
        borderCollapse: 'collapse',
        my: 1,
        fontSize: '0.8125rem',
        '& th, & td': { border: 1, borderColor: 'divider', px: 1, py: 0.5, textAlign: 'start' },
        '& th': { bgcolor: 'action.hover', fontWeight: 600 }
      }}
    >
      <thead>
        <tr>
          <th>ระดับ {INDICATOR_KINDS[kind].short}</th>
          <th>เกณฑ์ตัวชี้วัด</th>
          {!compact && <th>คำอธิบาย</th>}
        </tr>
      </thead>
      <tbody>
        {i.levels.map((l, n) => (
          <tr key={n}>
            <td>{n + 1}</td>
            <td>{l.criterion || '-'}</td>
            {!compact && <td>{l.note || '-'}</td>}
          </tr>
        ))}
      </tbody>
    </Box>
    <Typography variant='body2'>
      {INDICATOR_KINDS[kind].target} : <b>{targetText(i)}</b>
    </Typography>
    {!compact && i.detail && (
      <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-line', mt: 1 }}>
        {i.detail}
      </Typography>
    )}
  </Box>
)

const NamedList = ({ title, names }: { title: string; names: string[] }) => (
  <>
    <Heading>{title}</Heading>
    {names.length ? (
      names.map((n, k) => (
        <Typography key={k} variant='body2' sx={{ paddingInlineStart: 2 }}>
          {k + 1}. {n}
        </Typography>
      ))
    ) : (
      <None />
    )}
  </>
)

export const PeopleCell = ({ plan }: { plan: Erm3Record }) => (
  <>
    <Heading>ระยะเวลาดำเนินการ</Heading>
    <Typography variant='body2' sx={{ paddingInlineStart: 2 }}>
      {periodText(plan)}
    </Typography>
    <NamedList title='ผู้กำกับดูแลและรับผิดชอบหลัก' names={plan.supervisors} />
    <NamedList title='ผู้รับผิดชอบโดยตรง (Risk Owners)' names={plan.owners} />
  </>
)

const Indicators = ({ list, kind }: { list: Indicator[]; kind: IndicatorKind }) =>
  list.length ? (
    <>
      {list.map(i => (
        <IndicatorCard key={i.id} i={i} kind={kind} />
      ))}
    </>
  ) : (
    <None />
  )

const Erm3Report = ({ factor, plan }: { factor: string; plan: Erm3Record }) => {
  const cells = [
    <MeasureOutline key='m' measures={plan.measures} />,
    <Indicators key='k' list={plan.kpis} kind='kpis' />,
    <Indicators key='r' list={plan.kris} kind='kris' />,
    <LevelCell key='l' f={plan.expected} label={EXPECTED_LABEL} />,
    <PeopleCell key='p' plan={plan} />
  ]

  return (
    <>
      <Typography sx={{ mb: 3 }}>
        <b>ปัจจัยเสี่ยง :</b> {factor}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.3fr 1.2fr 1.2fr 1.3fr 1fr' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        {REPORT3_HEADINGS.map((h, i) => (
          <Typography
            key={h}
            variant='subtitle2'
            sx={{
              display: { xs: 'none', md: 'block' },
              p: 2,
              textAlign: 'center',
              fontWeight: 600,
              bgcolor: 'action.hover',
              borderInlineStart: i ? 1 : 0,
              borderColor: 'divider'
            }}
          >
            {h}
          </Typography>
        ))}
        {cells.map((c, i) => (
          <Box
            key={i}
            sx={{
              p: 2,
              minInlineSize: 0,
              borderBlockStart: 1,
              borderInlineStart: { md: i ? 1 : 0 },
              borderColor: 'divider'
            }}
          >
            <Typography variant='caption' color='text.secondary' sx={{ display: { md: 'none' }, fontWeight: 600 }}>
              {REPORT3_HEADINGS[i]}
            </Typography>
            {c}
          </Box>
        ))}
      </Box>
    </>
  )
}

export default Erm3Report

// ---- Word export -------------------------------------------------------------------------------------------

const p = (html: string, style = '') => `<p style="margin:0;${style}">${html}</p>`
const u = (s: string) => p(`<u><b>${escapeHtml(s)}</b></u>`, 'margin-top:4pt')

export const measuresHtml = (measures: Measure[], extra?: (m: Measure) => string) =>
  CONTROL_KINDS.map(c => {
    const items = outlineOf(measures, c.key)

    return (
      u(c.label) +
      (items.length
        ? items
            .map(
              m =>
                p(
                  `${m.no ? `${m.no}. ` : ''}${m.type === 'measure' ? escapeHtml(m.text) : `<b>${escapeHtml(m.text)}</b>`}`,
                  `margin-left:${8 + m.indent * 10}pt`
                ) + (m.type === 'measure' && extra ? extra(m) : '')
            )
            .join('')
        : p('-', 'margin-left:8pt'))
    )
  }).join('')

export const indicatorHtml = (i: Indicator, kind: IndicatorKind) =>
  p(`<b>${escapeHtml(i.name)}</b>`) +
  `<table style="width:auto;margin:2pt 0"><tr><th>ระดับ ${INDICATOR_KINDS[kind].short}</th><th>เกณฑ์ตัวชี้วัด</th><th>คำอธิบาย</th></tr>${i.levels
    .map(
      (l, n) =>
        `<tr><td>${n + 1}</td><td>${escapeHtml(l.criterion || '-')}</td><td>${escapeHtml(l.note || '-')}</td></tr>`
    )
    .join('')}</table>` +
  p(`${escapeHtml(INDICATOR_KINDS[kind].target)} : ${escapeHtml(targetText(i))}`) +
  (i.detail ? p(textToHtml(i.detail), 'margin-bottom:6pt') : '')

export const levelHtml = (f: Erm3Record['expected'], label: string) =>
  `${matrixHtml(f)}${p(escapeHtml(scoreText(f, label)), 'margin-top:4pt')}${p(escapeHtml(ratingText('likelihood', f.likelihood)))}${p(
    escapeHtml(ratingText('impact', f.impact))
  )}`

const listHtml = (title: string, names: string[]) =>
  u(title) +
  (names.length
    ? names.map((n, k) => p(`${k + 1}. ${escapeHtml(n)}`, 'margin-left:8pt')).join('')
    : p('-', 'margin-left:8pt'))

export const exportErm3Word = (plan: Erm3Record, c: ReportContext & { factor: string }) => {
  const cells = [
    measuresHtml(plan.measures),
    plan.kpis.map(i => indicatorHtml(i, 'kpis')).join('') || '-',
    plan.kris.map(i => indicatorHtml(i, 'kris')).join('') || '-',
    levelHtml(plan.expected, EXPECTED_LABEL),
    u('ระยะเวลาดำเนินการ') +
      p(escapeHtml(periodText(plan)), 'margin-left:8pt') +
      listHtml('ผู้กำกับดูแลและรับผิดชอบหลัก', plan.supervisors) +
      listHtml('ผู้รับผิดชอบโดยตรง (Risk Owners)', plan.owners)
  ]

  downloadWord(
    `ERM3 ${c.unit} ${c.year} ${c.factor.slice(0, 60)}`,
    `<h1>${escapeHtml(ERM3_TITLE)}</h1>
${[...contextLines(c), `ความเสี่ยง: ${c.risk}`, `ปัจจัยเสี่ยง: ${c.factor}`].map(l => `<p class="meta">${escapeHtml(l)}</p>`).join('')}
<table><thead><tr>${REPORT3_HEADINGS.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody><tr>${cells.map(x => `<td>${x}</td>`).join('')}</tr></tbody></table>`,
    { landscape: true }
  )
}
