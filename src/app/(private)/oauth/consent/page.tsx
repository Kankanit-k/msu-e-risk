// Consent screen for an external MCP client (central chatbot / LINE OA / Claude).
// Job: the signed-in user decides whether this client may act for them, and how much.
import type { Metadata } from 'next'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'

import CenteredCard from '@components/mcp/CenteredCard'
import LoginRequired from '@components/mcp/LoginRequired'
import themeConfig from '@configs/themeConfig'
import { sessionCaller } from '@/mcp/auth'
import { OAuthError, validateAuthRequest } from '@/mcp/oauth'

export const metadata: Metadata = { title: 'อนุญาตการเชื่อมต่อ' }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const FORWARDED = ['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'scope']

const ConsentPage = async ({ searchParams }: Props) => {
  const raw = await searchParams
  const params = new URLSearchParams()

  for (const key of FORWARDED) if (typeof raw[key] === 'string') params.set(key, raw[key] as string)

  let request

  try {
    request = await validateAuthRequest(params)
  } catch (err) {
    return (
      <CenteredCard>
        <Alert severity='error'>คำขอเชื่อมต่อไม่ถูกต้อง: {err instanceof OAuthError ? err.message : 'ข้อผิดพลาดของระบบ'}</Alert>
      </CenteredCard>
    )
  }

  const caller = await sessionCaller()

  if (!caller) return <LoginRequired />

  const canWrite = request.scopes.includes('mcp:write')
  const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

  return (
    <CenteredCard>
      <div className='flex flex-col gap-2'>
        <Typography variant='h5'>อนุญาตให้ “{request.client.client_name}” ทำงานแทนคุณ?</Typography>
        <Typography color='text.secondary'>
          {caller.name} · {themeConfig.templateSubtitle}
        </Typography>
      </div>

      <ul className='flex flex-col gap-2 m-0 pis-5'>
        <li>
          <Typography>อ่านข้อมูลในระบบได้เท่าที่สิทธิ์ของคุณอนุญาต</Typography>
        </li>
        {canWrite && (
          <li>
            <Typography>
              ขอเพิ่ม/แก้ไขข้อมูลแทนคุณ — ทุกครั้งคุณต้องเปิดลิงก์ในระบบนี้และกดยืนยันเอง ระบบไม่ดำเนินการให้โดยอัตโนมัติ
            </Typography>
          </li>
        )}
      </ul>

      <form method='post' action={`${basePath}/api/oauth/authorize/`} className='flex flex-col gap-4'>
        {[...params.entries()].map(([k, v]) => (
          <input key={k} type='hidden' name={k} value={v} />
        ))}
        {canWrite && <FormControlLabel control={<Checkbox name='read_only' />} label='อนุญาตให้อ่านข้อมูลอย่างเดียว' />}
        <Typography variant='body2' color='text.secondary'>
          ยกเลิกการเชื่อมต่อได้ทุกเมื่อที่หน้า “การเชื่อมต่อของฉัน”
        </Typography>
        <div className='flex flex-wrap justify-end gap-3'>
          <Button type='submit' name='decision' value='deny' variant='outlined' color='secondary'>
            ไม่อนุญาต
          </Button>
          <Button type='submit' name='decision' value='allow' variant='contained'>
            อนุญาต
          </Button>
        </div>
      </form>
    </CenteredCard>
  )
}

export default ConsentPage
