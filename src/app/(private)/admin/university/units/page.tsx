// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// University-admin page. Lives under /admin/university/... (universityAdmin tier).
// Access is enforced in src/middleware.ts via src/configs/accessControl.ts.
const UniversityUnitsPage = () => {
  return (
    <Card>
      <CardHeader
        title='จัดการหน่วยงาน'
        subheader='หน้าตัวอย่างสำหรับผู้ดูแลระดับมหาวิทยาลัย'
        action={<Chip label='University Admin' color='primary' size='small' />}
      />
      <CardContent>
        <Typography>
          หน้านี้เข้าถึงได้เฉพาะผู้ดูแลระดับมหาวิทยาลัย อยู่ภายใต้ <code>/admin/university/...</code> — แก้ไขได้ที่{' '}
          <code>src/app/(private)/admin/university/units/page.tsx</code>
        </Typography>
      </CardContent>
    </Card>
  )
}

export default UniversityUnitsPage
