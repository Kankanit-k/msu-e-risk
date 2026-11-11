// Admin-only audit log browser. Filters live in the query string (GET form), so they survive paging.
// Middleware gates /admin/** to deptAdmin; the page checks again because AUTH_DISABLED skips middleware.
import { redirect } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { accessLevelRank } from '@/configs/accessControl'
import { auditMonths, readAudit } from '@/libs/audit'
import type { AuditEntry } from '@/libs/audit'
import { sessionCaller } from '@/mcp/auth'

export const metadata = { title: 'บันทึกการใช้งาน' }
export const dynamic = 'force-dynamic'

type Search = { month?: string; actor?: string; action?: string; page?: string }

const time = (iso: string) => new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Bangkok' })

const show = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v))

const Changes = ({ entry }: { entry: AuditEntry }) => {
  const rows = Object.entries(entry.diff ?? {})

  if (!rows.length) return <Typography variant='body2' color='text.secondary'>—</Typography>

  return (
    <Box component='ul' sx={{ m: 0, pl: 4, fontSize: 13, wordBreak: 'break-word' }}>
      {rows.map(([k, [a, b]]) => (
        <li key={k}>
          <b>{k}</b>: {show(a)} → {show(b)}
        </li>
      ))}
    </Box>
  )
}

const AuditPage = async ({ searchParams }: { searchParams: Promise<Search> }) => {
  const caller = await sessionCaller()

  if (!caller || accessLevelRank[caller.role] < accessLevelRank.deptAdmin) redirect('/home')

  const q = await searchParams

  const [months, data] = await Promise.all([
    auditMonths(),
    readAudit({ month: q.month, actor: q.actor?.trim(), action: q.action?.trim(), page: Number(q.page) || 1 })
  ])

  const pageHref = (page: number) =>
    '?' + new URLSearchParams({ month: data.month, actor: q.actor ?? '', action: q.action ?? '', page: String(page) })

  const monthOptions = months.includes(data.month) ? months : [data.month, ...months]

  return (
    <Card>
      <CardHeader title='บันทึกการใช้งาน' subheader='ใครทำอะไร เมื่อไร และค่าที่เปลี่ยน — ล่าสุดอยู่บนสุด' />
      <CardContent>
        <Stack
          component='form'
          method='get'
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 4 }}
          data-tour='audit-filter'
        >
          <TextField select size='small' label='เดือน' name='month' defaultValue={data.month} slotProps={{ select: { native: true } }}>
            {monthOptions.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </TextField>
          <TextField size='small' label='ผู้กระทำ (รหัส)' name='actor' defaultValue={q.actor ?? ''} />
          <TextField size='small' label='การกระทำ' name='action' defaultValue={q.action ?? ''} placeholder='เช่น file.upload' />
          <Button type='submit' variant='contained'>
            ค้นหา
          </Button>
        </Stack>

        <div data-tour='audit-table'>
          {data.rows.length === 0 ? (
            <Typography color='text.secondary' sx={{ py: 8, textAlign: 'center' }}>
              ไม่พบรายการในเดือนนี้ ลองเปลี่ยนเดือนหรือล้างตัวกรอง
            </Typography>
          ) : (
            <>
              {/* Desktop: table. Mobile: stacked cards. */}
              <Table size='small' sx={{ display: { xs: 'none', md: 'table' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>เวลา</TableCell>
                    <TableCell>ผู้กระทำ</TableCell>
                    <TableCell>การกระทำ</TableCell>
                    <TableCell>รายการ</TableCell>
                    <TableCell>การเปลี่ยนแปลง</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((e, i) => (
                    <TableRow key={`${e.at}-${i}`}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{time(e.at)}</TableCell>
                      <TableCell>{e.actor}</TableCell>
                      <TableCell>
                        <code>{e.action}</code>
                      </TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{e.target ?? '—'}</TableCell>
                      <TableCell>
                        <Changes entry={e} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
                {data.rows.map((e, i) => (
                  <Box key={`${e.at}-${i}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 3 }}>
                    <Typography variant='body2' color='text.secondary'>
                      {time(e.at)} · {e.actor}
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>
                      <code>{e.action}</code> {e.target}
                    </Typography>
                    <Changes entry={e} />
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </div>

        <Stack direction='row' spacing={2} alignItems='center' justifyContent='flex-end' sx={{ mt: 4 }}>
          <Typography variant='body2' color='text.secondary'>
            {data.total} รายการ · หน้า {data.page}/{data.pages}
          </Typography>
          <Button size='small' href={pageHref(data.page - 1)} disabled={data.page <= 1}>
            ก่อนหน้า
          </Button>
          <Button size='small' href={pageHref(data.page + 1)} disabled={data.page >= data.pages}>
            ถัดไป
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default AuditPage
