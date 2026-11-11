// Component Imports

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
import Typography from '@mui/material/Typography'

import Link from '@/components/Link'

// Config Imports
import themeConfig from '@configs/themeConfig'

export const metadata = { title: 'หน้าแรก' }

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Sample figures for display only. They are not read from any database.
const kpis = [
  { title: 'ผู้ใช้งานทั้งหมด', value: '1,250', icon: 'ri-group-line' },
  { title: 'คำขอในเดือนนี้', value: '84', icon: 'ri-file-list-3-line' },
  { title: 'คำขอที่อนุมัติแล้ว', value: '61', icon: 'ri-checkbox-circle-line' },
  { title: 'หน่วยงานที่เข้าร่วม', value: '18', icon: 'ri-building-line' }
]

const publicReports = [
  { label: 'Analytics', desc: 'หน้าวิเคราะห์ข้อมูลสาธารณะ', href: '/dashboards/analytics', icon: 'ri-bar-chart-box-line' },
  { label: 'ผู้ใช้งาน', desc: 'รายชื่อผู้ใช้งานแบบสาธารณะ', href: '/users', icon: 'ri-user-line' }
]

const HomePage = () => {
  return (
    <Box>
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ py: 6 }}>
          <Typography variant='overline' color='text.secondary'>
            {themeConfig.templateOverline}
          </Typography>
          <Typography variant='h3' component='h1' gutterBottom>
            {themeConfig.templateName}
          </Typography>
          <Typography variant='h5' color='primary' gutterBottom>
            {themeConfig.templateSubtitle}
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            ระบบสารสนเทศสำหรับบุคลากรและการดำเนินงานของมหาวิทยาลัยมหาสารคาม
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            ข้อมูลสรุปและรายงานบางส่วนเปิดให้ทุกคนดูได้โดยไม่ต้องเข้าสู่ระบบ
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={6} sx={{ mb: 6 }} data-tour='kpis'>
        {kpis.map(kpi => (
          <Grid key={kpi.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant='subtitle2' color='text.secondary'>
                    {kpi.title}
                  </Typography>
                  <i className={kpi.icon} style={{ color: 'var(--mui-palette-primary-main)' }} />
                </Box>
                <Typography variant='h4'>{kpi.value}</Typography>
                <Chip label='ข้อมูลตัวอย่าง' size='small' variant='outlined' sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 6 }} data-tour='public-reports'>
        <CardHeader title='รายงานสาธารณะ' subheader='เปิดให้ทุกคนดูได้โดยไม่ต้องเข้าสู่ระบบ' />
        <CardContent>
          <Grid container spacing={3}>
            {publicReports.map(report => (
              <Grid key={report.href} size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box
                    sx={{
                      inlineSize: 44,
                      blockSize: 44,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'primary.main',
                      bgcolor: 'var(--mui-palette-primary-lightOpacity)'
                    }}
                  >
                    <i className={report.icon} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant='h6'>{report.label}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {report.desc}
                    </Typography>
                  </Box>
                  <Button component={Link} href={report.href} variant='outlined'>
                    เปิดดู
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {isDemoMode && (
        <Card sx={{ mb: 6 }}>
          <CardHeader title='ทดลองสิทธิ์ผู้ใช้ (โหมดสาธิต)' subheader='เลือกบทบาทตัวอย่างเพื่อดูว่าแต่ละสิทธิ์เห็นอะไรบ้าง' />
          <CardActions sx={{ px: 6, pb: 4 }}>
            <Button component={Link} href='/demo' variant='contained'>
              ไปที่หน้าทดลองสิทธิ์
            </Button>
          </CardActions>
        </Card>
      )}

      <Alert severity='info'>
        บุคลากรที่เข้าสู่ระบบจะเห็นเมนูและข้อมูลเพิ่มเติม — กดรูปโปรไฟล์มุมขวาบนเพื่อเข้าสู่ระบบด้วย ERP มมส
      </Alert>
    </Box>
  )
}

export default HomePage
