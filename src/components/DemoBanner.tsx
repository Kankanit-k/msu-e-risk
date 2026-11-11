'use client'

// MUI Imports
import Alert from '@mui/material/Alert'

// Slim warning bar shown on every private page while demo mode is on.
// NEXT_PUBLIC_DEMO_MODE is inlined at build time, so the check costs nothing at runtime.
const DemoBanner = () => {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  return (
    <Alert severity='warning' variant='filled' role='status' sx={{ borderRadius: 0, paddingBlock: 0.5 }}>
      โหมดสาธิต — ข้อมูลและบัญชีทั้งหมดเป็นข้อมูลจำลอง
    </Alert>
  )
}

export default DemoBanner
