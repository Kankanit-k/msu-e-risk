// Human confirmation of a write requested by a chatbot (B/C send the user here).
// Job: the user checks exactly what will change, then confirms or cancels it.
import type { Metadata } from 'next'

import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import ActionConfirm from '@components/mcp/ActionConfirm'
import CenteredCard from '@components/mcp/CenteredCard'
import LoginRequired from '@components/mcp/LoginRequired'
import { sessionCaller } from '@/mcp/auth'
import { getStore } from '@/mcp/store'

export const metadata: Metadata = { title: 'ยืนยันรายการ' }
export const dynamic = 'force-dynamic'

const STATUS_TEXT = {
  done: 'รายการนี้ดำเนินการไปแล้ว',
  failed: 'รายการนี้ดำเนินการไม่สำเร็จ',
  cancelled: 'รายการนี้ถูกยกเลิกแล้ว'
}

const ActionPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const caller = await sessionCaller()

  if (!caller) return <LoginRequired />

  const { id } = await params
  const data = await getStore().read()
  const action = data.actions.find(a => a.id === id && a.userId === caller.userId)
  const clientName = action && (data.clients.find(c => c.client_id === action.clientId)?.client_name ?? 'แชทในระบบ')

  let body

  if (!action) body = <Alert severity='warning'>ไม่พบรายการนี้ หรือรายการไม่ใช่ของคุณ</Alert>
  else if (action.status !== 'pending') body = <Alert severity='info'>{STATUS_TEXT[action.status]}</Alert>
  else if (Date.parse(action.expiresAt) <= Date.now()) body = <Alert severity='warning'>รายการหมดอายุแล้ว ให้สั่งใหม่จากแชท</Alert>
  else
    body = (
      <>
        <Typography color='text.secondary'>
          “{clientName}” ขอดำเนินการนี้แทนคุณ ตรวจสอบก่อนกดยืนยัน
        </Typography>
        <ActionConfirm id={action.id} preview={action.preview} />
      </>
    )

  return (
    <CenteredCard>
      <Typography variant='h5'>ยืนยันรายการ</Typography>
      {body}
    </CenteredCard>
  )
}

export default ActionPage
