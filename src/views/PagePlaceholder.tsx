// Stand-in for a menu page that has not been built yet (keeps every sidebar link from 404-ing).
// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

// Component Imports
import { EmptyState } from '@/components/kit'

const PagePlaceholder = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader title={title} subheader={description} />
    <CardContent>
      <EmptyState
        icon='ri-draft-line'
        title='หน้านี้อยู่ระหว่างพัฒนา'
        description='โครงเมนูตั้งต้นจากระบบ e-Risk เดิม'
      />
    </CardContent>
  </Card>
)

export default PagePlaceholder
