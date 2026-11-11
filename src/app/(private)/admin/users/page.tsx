// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Admin-only page. Lives under /admin/... (see CLAUDE.md → Routing & menu).
// Gate real access in middleware / the page itself; the sidebar only *hides* the link.
const AdminUsersPage = () => {
  return (
    <Card>
      <CardHeader
        title='จัดการผู้ใช้'
        subheader='หน้าตัวอย่างสำหรับผู้ดูแลระบบ'
        action={<Chip label='Admin' color='primary' size='small' />}
      />
      <CardContent>
        <Typography>
          หน้านี้เป็นตัวอย่างเมนูฝั่งผู้ดูแลระบบ ที่อยู่ภายใต้ <code>/admin/...</code> — แก้ไขได้ที่{' '}
          <code>src/app/(private)/admin/users/page.tsx</code>
        </Typography>
      </CardContent>
    </Card>
  )
}

export default AdminUsersPage
