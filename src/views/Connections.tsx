'use client'

// "การเชื่อมต่อของฉัน" — Job: a user sees which chatbots can act for them and cuts one off.
// One block: the list of connections, each with a revoke action behind a confirm dialog.
import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

type Grant = { id: string; client: string; scopes: string[]; createdAt: string; lastUsedAt?: string; revokedAt?: string }

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const Connections = () => {
  const [grants, setGrants] = useState<Grant[] | null>(null)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<Grant | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/oauth/grants/`)

      if (!res.ok) throw new Error()
      setGrants(((await res.json()) as { grants: Grant[] }).grants)
    } catch {
      setError('โหลดรายการไม่สำเร็จ ลองรีเฟรชหน้า')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const revoke = async () => {
    if (!target) return
    setBusy(true)

    const res = await fetch(`${basePath}/api/oauth/grants/?id=${encodeURIComponent(target.id)}`, { method: 'DELETE' })

    setBusy(false)
    setTarget(null)
    if (!res.ok) setError('ยกเลิกการเชื่อมต่อไม่สำเร็จ')
    await load()
  }

  const active = grants?.filter(g => !g.revokedAt) ?? []
  const past = grants?.filter(g => g.revokedAt) ?? []

  return (
    <Card data-tour='connections'>
      <CardHeader title='การเชื่อมต่อของฉัน' subheader='chatbot และแอปที่ได้รับอนุญาตให้ทำงานแทนคุณในระบบนี้' />
      <CardContent className='flex flex-col gap-4'>
        {error && <Alert severity='error'>{error}</Alert>}
        {grants === null && !error && (
          <div className='flex justify-center p-6' role='status'>
            <CircularProgress size={28} />
          </div>
        )}
        {grants !== null && active.length === 0 && (
          <Typography color='text.secondary'>
            ยังไม่มีการเชื่อมต่อ เมื่อคุณอนุญาตให้ chatbot เช่น Claude หรือ LINE ของมหาวิทยาลัยเข้าถึงระบบ รายการจะแสดงที่นี่
          </Typography>
        )}
        {active.map(g => (
          <div key={g.id} className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <Typography className='font-medium'>{g.client}</Typography>
                <Chip size='small' variant='outlined' label={g.scopes.includes('mcp:write') ? 'อ่าน + ขอแก้ไข' : 'อ่านอย่างเดียว'} />
              </div>
              <Typography variant='body2' color='text.secondary'>
                อนุญาตเมื่อ {fmt(g.createdAt)} · ใช้ล่าสุด {fmt(g.lastUsedAt)}
              </Typography>
            </div>
            <Button color='error' variant='outlined' onClick={() => setTarget(g)}>
              ยกเลิกการเชื่อมต่อ
            </Button>
          </div>
        ))}
        {past.length > 0 && (
          <>
            <Divider />
            <Typography variant='body2' color='text.secondary'>
              ยกเลิกแล้ว: {past.map(g => `${g.client} (${fmt(g.revokedAt)})`).join(', ')}
            </Typography>
          </>
        )}
      </CardContent>

      <Dialog open={!!target} onClose={() => !busy && setTarget(null)}>
        <DialogTitle>ยกเลิกการเชื่อมต่อ “{target?.client}”?</DialogTitle>
        <DialogContent>
          <Typography>แอปนี้จะใช้งานระบบแทนคุณไม่ได้ทันที ถ้าต้องการใช้อีกต้องอนุญาตใหม่</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)} disabled={busy}>
            ไม่ยกเลิก
          </Button>
          <Button color='error' variant='contained' onClick={revoke} disabled={busy}>
            ยกเลิกการเชื่อมต่อ
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default Connections
