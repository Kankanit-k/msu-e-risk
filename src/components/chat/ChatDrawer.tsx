'use client'

// In-app assistant (client A). Opens from the navbar into a side drawer — not a floating bubble.
// Job: ask the system a question in Thai, and confirm any change it proposes before it happens.
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import Alert from '@mui/material/Alert'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ActionConfirm from '@components/mcp/ActionConfirm'

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

type Turn = { role: 'user' | 'assistant'; content: string; actions?: { id: string; preview: string }[] }

const ChatDrawer = () => {
  const [open, setOpen] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || configured !== null) return
    fetch(`${basePath}/api/chat/`)
      .then(r => r.json())
      .then((b: { configured: boolean }) => setConfigured(b.configured))
      .catch(() => setConfigured(false))
  }, [open, configured])

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [turns, busy])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()

    if (!text || busy) return

    const next = [...turns, { role: 'user' as const, content: text }]

    setTurns(next)
    setInput('')
    setBusy(true)
    setError('')

    try {
      const res = await fetch(`${basePath}/api/chat/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) })
      })

      const body = (await res.json()) as { reply?: string; actions?: Turn['actions']; error?: string }

      if (!res.ok) throw new Error(body.error ?? 'เกิดข้อผิดพลาด')
      setTurns([...next, { role: 'assistant', content: body.reply ?? '', actions: body.actions }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Tooltip title='ผู้ช่วย AI'>
        <IconButton onClick={() => setOpen(true)} aria-label='เปิดผู้ช่วย AI' data-tour='chat' className='text-textPrimary'>
          <i className='ri-sparkling-line' />
        </IconButton>
      </Tooltip>

      <Drawer anchor='right' open={open} onClose={() => setOpen(false)} slotProps={{ paper: { className: 'is-full sm:is-[420px]' } }}>
        <div className='flex items-center justify-between gap-2 p-4 border-be'>
          <Typography variant='h6'>ผู้ช่วย AI</Typography>
          <IconButton onClick={() => setOpen(false)} aria-label='ปิด'>
            <i className='ri-close-line' />
          </IconButton>
        </div>

        <div className='flex flex-col gap-3 flex-auto overflow-y-auto p-4' aria-live='polite'>
          {configured === false && (
            <Alert severity='info'>ยังไม่ได้ตั้งค่า AI ของระบบนี้ ผู้ดูแลต้องใส่ LLM_API_KEY ใน env ก่อน</Alert>
          )}
          {configured && turns.length === 0 && (
            <Typography color='text.secondary'>
              ถามเกี่ยวกับระบบนี้ได้ เช่น “ฉันมีสิทธิ์อะไรบ้าง” หรือ “หน้าแรกใช้ทำอะไร” ถ้าขอให้แก้ไขข้อมูล ระบบจะให้คุณกดยืนยันก่อนทุกครั้ง
            </Typography>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'self-end max-is-[85%]' : 'self-start max-is-[92%] flex flex-col gap-2'}>
              <Paper
                variant='outlined'
                className={`plb-2 pli-3 whitespace-pre-wrap ${t.role === 'user' ? 'bg-primaryLighter' : ''}`}
              >
                <Typography>{t.content}</Typography>
              </Paper>
              {t.actions?.map(a => (
                <Paper key={a.id} variant='outlined' className='p-3'>
                  <ActionConfirm id={a.id} preview={a.preview} compact />
                </Paper>
              ))}
            </div>
          ))}
          {busy && (
            <Typography variant='body2' color='text.secondary' role='status'>
              กำลังคิด…
            </Typography>
          )}
          {error && <Alert severity='error'>{error}</Alert>}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className='flex items-center gap-2 p-3 border-bs'>
          <InputBase
            className='flex-auto pli-2'
            placeholder='พิมพ์คำถาม…'
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!configured || busy}
            inputProps={{ 'aria-label': 'ข้อความถึงผู้ช่วย AI', maxLength: 2000 }}
          />
          <IconButton type='submit' color='primary' disabled={!configured || busy || !input.trim()} aria-label='ส่ง'>
            <i className='ri-send-plane-2-line' />
          </IconButton>
        </form>
      </Drawer>
    </>
  )
}

export default ChatDrawer
