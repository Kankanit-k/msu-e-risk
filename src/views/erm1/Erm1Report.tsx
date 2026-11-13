'use client'

// ERM1 report: the 5-column Organization Context table. Columns sit side by side on wide screens and
// stack on phones. exportErm1Word() writes the same columns into a landscape Word file.
import { Fragment } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Lib Imports
import { downloadWord, escapeHtml, textToHtml } from '@/libs/export/word'
import { reportColumns } from '@/services/erm1Types'
import type { Erm1Analysis } from '@/services/erm1Types'

export const REPORT_TITLE = 'แบบฟอร์มการวิเคราะห์สภาพแวดล้อมองค์กร / บริบทเกี่ยวกับหน่วยงาน (Organization Context)'

/** Lines above the table: unit, year, SO, goal, process. */
export type ReportContext = { year: number; unit: string; so: string; goal: string; process: string }

export const contextLines = (c: ReportContext) => [
  `คณะ / หน่วยงาน: ${c.unit} · ปีงบประมาณ ${c.year}`,
  `วัตถุประสงค์เชิงกลยุทธ์: ${c.so}`,
  `เป้าประสงค์: ${c.goal}`,
  `กระบวนการดำเนินงาน(หลัก): ${c.process}`
]

export const exportErm1Word = (a: Erm1Analysis, c: ReportContext) => {
  const cols = reportColumns(a)

  const cell = (blocks: { heading: string; text: string }[]) =>
    blocks
      .map(
        b =>
          `${b.heading ? `<p style="margin:0"><u><b>${escapeHtml(b.heading)}</b></u></p>` : ''}<p style="margin:0 0 6pt 8pt">${textToHtml(b.text)}</p>`
      )
      .join('') || '-'

  downloadWord(
    `ERM1 ${c.unit} ${c.year} ${c.process.slice(0, 60)}`,
    `<h1>ERM1 : ${escapeHtml(REPORT_TITLE)}</h1>
${contextLines(c)
  .map(l => `<p class="meta">${escapeHtml(l)}</p>`)
  .join('')}
<table><thead><tr>${cols.map(col => `<th>${escapeHtml(col.title)}</th>`).join('')}</tr></thead>
<tbody><tr>${cols.map(col => `<td>${cell(col.blocks)}</td>`).join('')}</tr></tbody></table>`,
    { landscape: true }
  )
}

const Erm1Report = ({ analysis }: { analysis: Erm1Analysis }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1.4fr 1.4fr 1.1fr 1fr 1fr' },
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      overflow: 'hidden'
    }}
  >
    {reportColumns(analysis).map((col, i) => (
      <Box
        key={col.title}
        sx={{
          borderInlineStart: { md: i ? 1 : 0 },
          borderBlockStart: { xs: i ? 1 : 0, md: 0 },
          borderColor: 'divider'
        }}
      >
        <Typography
          variant='subtitle2'
          sx={{
            p: 2,
            textAlign: 'center',
            fontWeight: 600,
            bgcolor: 'action.hover',
            minBlockSize: { md: 64 },
            borderBlockEnd: 1,
            borderColor: 'divider'
          }}
        >
          {col.title}
        </Typography>
        <Box sx={{ p: 2 }}>
          {col.blocks.length === 0 ? (
            <Typography variant='body2' color='text.disabled'>
              ยังไม่ได้กรอก
            </Typography>
          ) : (
            col.blocks.map((b, j) => (
              <Fragment key={j}>
                {b.heading && (
                  <Typography variant='body2' sx={{ fontWeight: 600, textDecoration: 'underline' }}>
                    {b.heading}
                  </Typography>
                )}
                <Typography variant='body2' sx={{ whiteSpace: 'pre-line', paddingInlineStart: 2, mb: 1.5 }}>
                  {b.text}
                </Typography>
              </Fragment>
            ))
          )}
        </Box>
      </Box>
    ))}
  </Box>
)

export default Erm1Report
