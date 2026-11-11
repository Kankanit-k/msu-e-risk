'use client'

// React Imports
import { useEffect } from 'react'

// Logger Imports
import { clientLogger } from '@/libs/logger/client'

// Last-resort boundary: catches errors thrown in the root layout itself.
const GlobalError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    clientLogger.fatal('Root layout crashed', { source: 'react', error, context: { digest: error.digest } })
  }, [error])

  return (
    <html lang='th'>
      <body style={{ fontFamily: 'sans-serif', padding: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBlockEnd: '0.5rem' }}>เกิดข้อผิดพลาดร้ายแรง</h1>
        <p style={{ marginBlockEnd: '1.5rem', color: '#666' }}>
          ระบบได้บันทึกข้อผิดพลาดนี้ไว้แล้ว และแจ้งเตือนผู้ดูแลระบบโดยอัตโนมัติ
        </p>
        {error.digest ? <p style={{ color: '#999' }}>รหัสอ้างอิง: {error.digest}</p> : null}
        <button onClick={reset} style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}>
          ลองใหม่อีกครั้ง
        </button>
      </body>
    </html>
  )
}

export default GlobalError
