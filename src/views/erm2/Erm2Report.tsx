'use client'

// ERM2 report: 6 columns, one row per risk factor, process and Key Risk spanning all rows. Stacks on phones.
// RiskMatrix is the 5×5 L × I grid used here, in the editor, and (as HTML) in the Word export.
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Lib Imports
import { downloadWord, escapeHtml, textToHtml } from '@/libs/export/word'
import {
  CONTROL_HEADINGS,
  REPORT_HEADINGS,
  RESIDUAL_HEADINGS,
  adequacyLabel,
  ratingText,
  riskLevel,
  scoreText
} from '@/services/erm2Types'
import type { RiskFactor, Scored } from '@/services/erm2Types'

export const REPORT_TITLE = 'ERM2 : การประเมินความเสี่ยง (ปัจจัยเสี่ยง การควบคุมที่มีอยู่ และระดับความเสี่ยง)'

export type ReportContext = { year: number; unit: string; so: string; goal: string; process: string; risk: string }

export const contextLines = (c: ReportContext) => [
  `คณะ / หน่วยงาน: ${c.unit} · ปีงบประมาณ ${c.year}`,
  `วัตถุประสงค์เชิงกลยุทธ์: ${c.so}`,
  `เป้าประสงค์: ${c.goal}`
]

const ROWS = [5, 4, 3, 2, 1]
const COLS = [1, 2, 3, 4, 5]
const GREY = '#6b6b6b'

/** 5×5 matrix, impact 5→1 top to bottom, likelihood 1→5 left to right. The rated cell takes its level color. */
export const RiskMatrix = ({ factor, small = false }: { factor?: Scored; small?: boolean }) => {
  const L = factor?.likelihood?.score
  const I = factor?.impact?.score
  const cell = small ? 22 : 38

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {!small && (
        <Typography
          variant='caption'
          sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          ผลกระทบ (Impact/Consequences)
        </Typography>
      )}
      <Box>
        <Box
          role='img'
          aria-label={L && I ? `ระดับความเสี่ยง L ${L} × I ${I} = ${L * I}` : 'ยังไม่ได้ประเมินระดับความเสี่ยง'}
          sx={{ display: 'grid', gridTemplateColumns: `repeat(5, ${cell}px)`, gap: '2px', bgcolor: '#444', p: '2px' }}
        >
          {ROWS.flatMap(i =>
            COLS.map(l => {
              const s = l * i
              const on = l === L && i === I
              const lv = riskLevel(s)

              return (
                <Box
                  key={`${i}-${l}`}
                  sx={{
                    blockSize: cell,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: small ? 10 : 12,
                    fontWeight: on ? 700 : 500,
                    bgcolor: on ? lv.color : GREY,
                    color: on ? lv.text : '#fff'
                  }}
                >
                  {s}
                </Box>
              )
            })
          )}
        </Box>
        {!small && (
          <Typography variant='caption' component='p' sx={{ textAlign: 'center', fontWeight: 600, mt: 1 }}>
            โอกาส (Likelihood/Frequency)
          </Typography>
        )}
      </Box>
    </Box>
  )
}

/** Small colored square with the L × I score, "–" until rated (the list page and tabs). */
export const ScoreBadge = ({ score }: { score?: number }) => {
  const lv = score === undefined ? undefined : riskLevel(score)

  return (
    <Box
      title={lv ? `ระดับ${lv.name}` : 'ยังไม่ได้ประเมิน'}
      sx={{
        inlineSize: 40,
        blockSize: 40,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: '1.125rem',
        borderRadius: 1,
        bgcolor: lv?.color ?? 'action.disabledBackground',
        color: lv?.text ?? 'text.disabled'
      }}
    >
      {score ?? '–'}
    </Box>
  )
}

const Heading = ({ children }: { children: ReactNode }) => (
  <Typography variant='body2' sx={{ fontWeight: 600, textDecoration: 'underline', mt: 1 }}>
    {children}
  </Typography>
)

const Body = ({ text }: { text?: string }) => (
  <Typography
    variant='body2'
    color={text?.trim() ? undefined : 'text.disabled'}
    sx={{ whiteSpace: 'pre-line', paddingInlineStart: 2, mb: 1 }}
  >
    {text?.trim() || 'ยังไม่ได้กรอก'}
  </Typography>
)

export const ControlsCell = ({ f }: { f: RiskFactor }) => (
  <>
    <Heading>{CONTROL_HEADINGS.preventive} :</Heading>
    <Body text={f.preventive} />
    <Heading>{CONTROL_HEADINGS.loss} :</Heading>
    <Body text={f.loss} />
    <Heading>{CONTROL_HEADINGS.adequacy} :</Heading>
    <Body text={adequacyLabel(f.adequacy)} />
  </>
)

export const LevelCell = ({ f, label }: { f: Scored; label?: string }) => (
  <>
    <RiskMatrix factor={f} />
    <Typography variant='body2' sx={{ mt: 2 }}>
      {scoreText(f, label)}
    </Typography>
    <Typography variant='body2'>{ratingText('likelihood', f.likelihood)}</Typography>
    <Typography variant='body2'>{ratingText('impact', f.impact)}</Typography>
  </>
)

export const ResidualCell = ({ f }: { f: RiskFactor }) => (
  <>
    <Heading>{RESIDUAL_HEADINGS.internal} :</Heading>
    <Body text={f.internal} />
    <Heading>{RESIDUAL_HEADINGS.external} :</Heading>
    <Body text={f.external} />
  </>
)

const cellSx = (col: number) => ({
  p: 2,
  borderBlockStart: 1,
  borderInlineStart: { md: col ? 1 : 0 },
  borderColor: 'divider',
  minInlineSize: 0
})

const Label = ({ col }: { col: number }) => (
  <Typography variant='caption' color='text.secondary' sx={{ display: { md: 'none' }, fontWeight: 600 }}>
    {REPORT_HEADINGS[col]}
  </Typography>
)

const Erm2Report = ({ process, risk, factors }: { process: string; risk: string; factors: RiskFactor[] }) => {
  const span = { md: `span ${Math.max(factors.length, 1)}` }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.1fr 1.5fr 1.4fr 1.3fr' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {REPORT_HEADINGS.map((h, i) => (
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
      <Box sx={{ ...cellSx(0), gridRow: span }}>
        <Label col={0} />
        <Typography variant='body2'>{process}</Typography>
      </Box>
      <Box sx={{ ...cellSx(1), gridRow: span }}>
        <Label col={1} />
        <Typography variant='body2'>{risk}</Typography>
      </Box>
      {factors.length === 0 && (
        <Typography color='text.disabled' sx={{ ...cellSx(2), gridColumn: { md: 'span 4' } }}>
          ยังไม่มีปัจจัยเสี่ยง
        </Typography>
      )}
      {factors.flatMap((f, n) => [
        <Box key={`${f.id}-t`} sx={cellSx(2)}>
          <Label col={2} />
          <Typography variant='body2'>
            {factors.length > 1 && `${n + 1}) `}
            {f.text}
          </Typography>
        </Box>,
        <Box key={`${f.id}-c`} sx={cellSx(3)}>
          <Label col={3} />
          <ControlsCell f={f} />
        </Box>,
        <Box key={`${f.id}-l`} sx={cellSx(4)}>
          <Label col={4} />
          <LevelCell f={f} />
        </Box>,
        <Box key={`${f.id}-r`} sx={cellSx(5)}>
          <Label col={5} />
          <ResidualCell f={f} />
        </Box>
      ])}
    </Box>
  )
}

export default Erm2Report

// ---- Word export -------------------------------------------------------------------------------------------

export const matrixHtml = (f: Scored) => {
  const L = f.likelihood?.score
  const I = f.impact?.score

  const rows = ROWS.map(
    i =>
      `<tr>${COLS.map(l => {
        const on = l === L && i === I
        const lv = riskLevel(l * i)

        return `<td style="width:22pt;height:18pt;text-align:center;vertical-align:middle;padding:0;background:${on ? lv.color : GREY};color:${on ? lv.text : '#fff'};font-size:10pt">${l * i}</td>`
      }).join('')}</tr>`
  ).join('')

  return `<table style="width:auto;margin:0">${rows}</table><p style="margin:0;font-size:10pt">แกนตั้ง: ผลกระทบ (I) · แกนนอน: โอกาส (L)</p>`
}

const block = (heading: string, text?: string) =>
  `<p style="margin:0"><u><b>${escapeHtml(heading)} :</b></u></p><p style="margin:0 0 6pt 8pt">${text?.trim() ? textToHtml(text) : '-'}</p>`

export const exportErm2Word = (factors: RiskFactor[], c: ReportContext) => {
  const n = Math.max(factors.length, 1)

  const factorCells = (f: RiskFactor, i: number) =>
    `<td>${factors.length > 1 ? `${i + 1}) ` : ''}${escapeHtml(f.text)}</td>
<td>${block(CONTROL_HEADINGS.preventive, f.preventive)}${block(CONTROL_HEADINGS.loss, f.loss)}${block(CONTROL_HEADINGS.adequacy, adequacyLabel(f.adequacy))}</td>
<td>${matrixHtml(f)}<p style="margin:4pt 0 0">${escapeHtml(scoreText(f))}</p><p style="margin:0">${escapeHtml(ratingText('likelihood', f.likelihood))}</p><p style="margin:0">${escapeHtml(ratingText('impact', f.impact))}</p></td>
<td>${block(RESIDUAL_HEADINGS.internal, f.internal)}${block(RESIDUAL_HEADINGS.external, f.external)}</td>`

  const lead = `<td rowspan="${n}">${escapeHtml(c.process)}</td><td rowspan="${n}">${escapeHtml(c.risk)}</td>`

  const body = factors.length
    ? factors.map((f, i) => `<tr>${i ? '' : lead}${factorCells(f, i)}</tr>`).join('')
    : `<tr>${lead}<td colspan="4">ยังไม่มีปัจจัยเสี่ยง</td></tr>`

  downloadWord(
    `ERM2 ${c.unit} ${c.year} ${c.risk.slice(0, 60)}`,
    `<h1>${escapeHtml(REPORT_TITLE)}</h1>
${contextLines(c)
  .map(l => `<p class="meta">${escapeHtml(l)}</p>`)
  .join('')}
<table><thead><tr>${REPORT_HEADINGS.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody>${body}</tbody></table>`,
    { landscape: true }
  )
}
