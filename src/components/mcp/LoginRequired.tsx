// Shown when a page needs a signed-in caller. Server-safe: no hooks and no sign-in call.
// Login starts only from the profile menu (UserDropdown), so this component only explains the steps.
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import CenteredCard from '@components/mcp/CenteredCard'

const LoginRequired = () => (
  <CenteredCard>
    <Typography variant='h5'>ต้องเข้าสู่ระบบก่อน</Typography>
    <Alert severity='info'>
      รายการนี้ต้องเข้าสู่ระบบก่อน กรุณาคลิกรูปโปรไฟล์มุมขวาบน เลือก “เข้าสู่ระบบด้วย ERP มมส” แล้วกลับมาที่หน้านี้ หรือรีโหลดหน้านี้อีกครั้ง
    </Alert>
  </CenteredCard>
)

export default LoginRequired
