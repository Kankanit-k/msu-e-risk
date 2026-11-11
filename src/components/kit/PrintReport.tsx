'use client'

// Printable report: hidden on screen, it is the only thing on paper when the user prints
// (window.print() → "Save as PDF" gives a Thai PDF, since the browser renders the Sarabun web font).
// The rest of the page is hidden in print, the same way src/views/manual/Manual.tsx does it.
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// MUI Imports
import GlobalStyles from '@mui/material/GlobalStyles'

export type ReportColumn<T> = { label: string; value: (row: T) => ReactNode; align?: 'left' | 'right' | 'center' }

type Props<T> = {
  title: string

  /** Lines under the title, e.g. the active filters and the print date. */
  meta?: string[]
  rows: T[]
  columns: ReportColumn<T>[]
  getRowId: (row: T) => string
  footer?: ReactNode
}

const printStyles = (
  <GlobalStyles
    styles={{
      '.print-report': { display: 'none' },
      '@media print': {
        '@page': { size: 'A4', margin: '15mm' },
        body: { background: '#fff !important' },
        'body *': { visibility: 'hidden' },
        '.print-report, .print-report *': { visibility: 'visible' },
        '.print-report': {
          display: 'block !important',
          position: 'absolute',
          insetBlockStart: 0,
          insetInlineStart: 0,
          inlineSize: '100%',
          color: '#000',
          fontFamily: `var(--font-body), 'Sarabun', 'TH Sarabun New', sans-serif`,
          fontSize: '12pt'
        },
        '.print-report table': { inlineSize: '100%', borderCollapse: 'collapse' },
        '.print-report th, .print-report td': {
          border: '1px solid #999',
          padding: '4pt 6pt',
          textAlign: 'start',
          verticalAlign: 'top'
        },
        '.print-report thead': { display: 'table-header-group' }, // repeat header on every page
        '.print-report tr': { breakInside: 'avoid' },
        '.print-report h1': { fontSize: '16pt', margin: '0 0 4pt' }
      }
    }}
  />
)

const PrintReport = <T,>({ title, meta = [], rows, columns, getRowId, footer }: Props<T>) => {
  // Stamp the time when printing starts (not at render — that would differ between server and client).
  const [printedAt, setPrintedAt] = useState('')

  useEffect(() => {
    const stamp = () => setPrintedAt(new Date().toLocaleString('th-TH'))

    window.addEventListener('beforeprint', stamp)

    return () => window.removeEventListener('beforeprint', stamp)
  }, [])

  return (
    <>
      {printStyles}
      <section className='print-report' aria-hidden>
        <h1>{title}</h1>
        {meta.map(m => (
          <div key={m}>{m}</div>
        ))}
        {printedAt && <div>พิมพ์เมื่อ {printedAt}</div>}
        <table style={{ marginBlockStart: '8pt' }}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              {columns.map(c => (
                <th key={c.label} style={{ textAlign: c.align }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={getRowId(row)}>
                <td>{i + 1}</td>
                {columns.map(c => (
                  <td key={c.label} style={{ textAlign: c.align }}>
                    {c.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {footer}
      </section>
    </>
  )
}

export default PrintReport
