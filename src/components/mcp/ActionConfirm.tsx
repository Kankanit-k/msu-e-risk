'use client'

// Confirm / cancel one pending write action. Used by the /actions/[id] page and the chat drawer.
import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

type Props = { id: string; preview: string; compact?: boolean }

type State = { phase: 'idle' | 'busy' } | { phase: 'done' | 'cancelled' | 'failed'; message: string }

const ActionConfirm = ({ id, preview, compact }: Props) => {
  const [state, setState] = useState<State>({ phase: 'idle' })

  const decide = async (decision: 'confirm' | 'cancel') => {
    setState({ phase: 'busy' })

    try {
      const res = await fetch(`${basePath}/api/actions/${id}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision })
      })

      const body = (await res.json()) as { ok: boolean; cancelled?: boolean; message?: string }

      if (!body.ok) setState({ phase: 'failed', message: body.message ?? 'ดำเนินการไม่สำเร็จ' })
      else if (body.cancelled) setState({ phase: 'cancelled', message: 'ยกเลิกรายการแล้ว ไม่มีการเปลี่ยนแปลงข้อมูล' })
      else setState({ phase: 'done', message: 'ดำเนินการเรียบร้อยแล้ว' })
    } catch {
      setState({ phase: 'failed', message: 'เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้ง' })
    }
  }

  if (state.phase === 'done' || state.phase === 'cancelled' || state.phase === 'failed')
    return (
      <Alert severity={state.phase === 'done' ? 'success' : state.phase === 'cancelled' ? 'info' : 'error'} role='status'>
        {state.message}
      </Alert>
    )

  const busy = state.phase === 'busy'

  return (
    <div className='flex flex-col gap-3'>
      <Typography variant={compact ? 'body2' : 'body1'} className='font-medium'>
        {preview}
      </Typography>
      <div className='flex flex-wrap justify-end gap-2'>
        <Button size={compact ? 'small' : 'medium'} variant='outlined' color='secondary' disabled={busy} onClick={() => decide('cancel')}>
          ยกเลิก
        </Button>
        <Button size={compact ? 'small' : 'medium'} variant='contained' disabled={busy} onClick={() => decide('confirm')}>
          {busy ? 'กำลังดำเนินการ…' : 'ยืนยัน'}
        </Button>
      </div>
    </div>
  )
}

export default ActionConfirm
