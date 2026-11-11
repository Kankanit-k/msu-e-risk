// Next Imports
import type { Metadata } from 'next'

// MUI Imports
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = {
  title: 'ต้องเข้าสู่ระบบ'
}

// Shown (via middleware rewrite, HTTP 401) in place of a protected page to anonymous visitors.
// Deliberately has no sign-in button: login starts only from the profile menu.
const AuthRequiredPage = () => {
  return (
    <Card>
      <CardHeader title='ต้องเข้าสู่ระบบ' subheader='Sign in required' />
      <CardContent className='flex flex-col gap-4'>
        <Alert severity='warning' icon={<i className='ri-lock-line' />}>
          หน้านี้ต้องเข้าสู่ระบบก่อนจึงจะใช้งานได้
        </Alert>
        <Typography>
          กรุณากดรูปโปรไฟล์ที่มุมขวาบน แล้วเลือก <strong>เข้าสู่ระบบด้วย ERP มมส</strong>
        </Typography>
        <Typography color='text.secondary'>
          หากยังไม่มีบัญชี ERP มมส กรุณาติดต่อหน่วยงานที่เกี่ยวข้องเพื่อขอสิทธิ์การใช้งาน
        </Typography>
      </CardContent>
    </Card>
  )
}

export default AuthRequiredPage
