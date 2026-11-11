'use client'

// React Imports
import { useState } from 'react'

// Next-Auth Imports
import { useSession } from 'next-auth/react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

// Config Imports
import { accessLevelRank } from '@/configs/accessControl'
import { demoPersonas, permissionMatrix, personaFullName, roles } from '@/configs/roles'
import type { RoleId } from '@/configs/roles'

// Util Imports
import { clientLogger } from '@/libs/logger/client'

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''
const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DemoRoles = () => {
  const { data: session } = useSession()
  const [pendingId, setPendingId] = useState<RoleId | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!demoEnabled) {
    return (
      <Alert severity='info'>
        โหมดสาธิตยังไม่ได้เปิดใช้งาน ผู้ดูแลระบบต้องตั้งค่า NEXT_PUBLIC_DEMO_MODE=true (ฝั่งไคลเอ็นต์) และ DEMO_MODE=true
        (ฝั่งเซิร์ฟเวอร์) พร้อม NEXTAUTH_SECRET แล้วรีสตาร์ทเซิร์ฟเวอร์ ไม่ควรเปิดโหมดนี้บนระบบจริง
      </Alert>
    )
  }

  // Demo sessions carry DEMO-prefixed STAFFIDs (persona id + random suffix) in session.user.id (see src/app/api/demo/session/route.ts).
  const sessionUserId = (session?.user as { id?: unknown } | undefined)?.id
  const isDemoSession = typeof sessionUserId === 'string' && sessionUserId.startsWith('DEMO-')
  const isRealSession = !!session?.user && !isDemoSession
  const activePersona = isDemoSession ? demoPersonas.find(p => sessionUserId.startsWith(`${p.persona.staffId}-`)) : undefined

  const selectRole = async (roleId: RoleId) => {
    setPendingId(roleId)
    setError(null)

    try {
      const res =
        roleId === 'guest'
          ? await fetch(`${basePath}/api/demo/session`, { method: 'DELETE' })
          : await fetch(`${basePath}/api/demo/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId: roleId })
            })

      if (!res.ok) {
        throw new Error(`Demo session request failed with status ${res.status}`)
      }

      // Full page load so the server sees the new session cookie on every route.
      window.location.href = `${basePath}/`
    } catch (err) {
      clientLogger.error('Demo role switch failed', { error: err, context: { personaId: roleId } })
      setError('ไม่สามารถเปลี่ยนบทบาทสาธิตได้ กรุณาลองใหม่อีกครั้ง')
      setPendingId(null)
    }
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant='h4' component='h1' gutterBottom>
          จำลองสิทธิ์
        </Typography>
        <Typography color='text.secondary'>
          เลือกบทบาทเพื่อดูระบบในมุมมองของผู้ใช้แต่ละระดับ ข้อมูลและบัญชีทั้งหมดเป็นข้อมูลจำลอง
        </Typography>
      </Box>

      {activePersona && (
        <Alert severity='info'>
          กำลังใช้งานในฐานะ {activePersona.label}: {personaFullName(activePersona.persona)} ({activePersona.persona.position},{' '}
          {activePersona.persona.unit})
        </Alert>
      )}

      {isRealSession && (
        <Alert severity='warning'>
          คุณเข้าสู่ระบบด้วยบัญชีจริงอยู่ การเลือกบทบาทสาธิตจะแทนที่เซสชันปัจจุบัน
        </Alert>
      )}

      {error && <Alert severity='error'>{error}</Alert>}

      <Grid container spacing={4}>
        {demoPersonas.map(card => {
          const isGuest = card.roleId === 'guest'
          const isActive = isDemoSession && activePersona?.roleId === card.roleId

          return (
            <Grid key={card.roleId} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  avatar={<Box component='i' className={card.icon} sx={{ fontSize: 32, color: 'primary.main' }} aria-hidden />}
                  title={card.label}
                  slotProps={{ title: { variant: 'subtitle1' } }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={2}>
                    <Typography variant='body2' color='text.secondary'>
                      {card.description}
                    </Typography>

                    <Box>
                      <Typography variant='subtitle2'>ตัวตนจำลอง</Typography>
                      <Typography variant='body2'>
                        {personaFullName(card.persona) || '-'}
                        {card.persona.staffId ? ` (${card.persona.staffId})` : ''}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {card.persona.position} · {card.persona.unit}
                      </Typography>
                    </Box>

                    <Box component='ul' sx={{ margin: 0, paddingInlineStart: 4 }}>
                      {card.can.map(item => (
                        <Typography key={item} component='li' variant='body2'>
                          {item}
                        </Typography>
                      ))}
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ paddingInline: 4, paddingBlockEnd: 4, justifyContent: 'space-between' }}>
                  {isActive ? <Chip size='small' color='success' label='กำลังใช้งาน' /> : <span />}
                  <Button
                    variant={isGuest ? 'outlined' : 'contained'}
                    disabled={pendingId !== null}
                    onClick={() => selectRole(card.roleId)}
                  >
                    {isGuest ? 'ล้างเซสชันสาธิต' : 'ใช้งานในฐานะบทบาทนี้'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Card>
        <CardHeader title='ตารางสิทธิ์การเข้าถึง' subheader='ระดับบทบาทขั้นต่ำของแต่ละฟีเจอร์' />
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>ฟีเจอร์</TableCell>
                <TableCell>บทบาทขั้นต่ำ</TableCell>
                {roles.map(role => (
                  <TableCell key={role.id} align='center'>
                    {role.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {permissionMatrix.map(row => {
                const minRank = accessLevelRank[row.minLevel]
                const minRole = roles.find(r => r.level === row.minLevel)

                return (
                  <TableRow key={row.feature}>
                    <TableCell>{row.feature}</TableCell>
                    <TableCell>{minRole?.label ?? '-'}</TableCell>
                    {roles.map(role => {
                      const allowed = accessLevelRank[role.level] >= minRank

                      return (
                        <TableCell key={role.id} align='center'>
                          {allowed ? (
                            <Box component='i' className='ri-check-line' sx={{ color: 'success.main' }} role='img' aria-label='อนุญาต' />
                          ) : (
                            <Typography component='span' color='text.disabled' aria-label='ไม่อนุญาต'>
                              -
                            </Typography>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  )
}

export default DemoRoles
