'use client'

// React Imports
import { useEffect } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Logger Imports
import { clientLogger } from '@/libs/logger/client'

// Route-level boundary: every uncaught render/data error in the app reports here first.
const Error = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    clientLogger.error('Unhandled render error', { source: 'react', error, context: { digest: error.digest } })
  }, [error])

  return (
    <div className='flex flex-col items-center justify-center gap-4 text-center min-bs-[80vh] p-6'>
      <Typography variant='h4'>เกิดข้อผิดพลาดบางอย่าง</Typography>
      <Typography color='text.secondary'>
        ระบบได้บันทึกข้อผิดพลาดนี้ไว้แล้ว และแจ้งเตือนผู้ดูแลระบบโดยอัตโนมัติ
      </Typography>
      {error.digest ? <Typography variant='caption'>รหัสอ้างอิง: {error.digest}</Typography> : null}
      <Button variant='contained' onClick={reset}>
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  )
}

export default Error
