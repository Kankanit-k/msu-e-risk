// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

// This is the simplest possible page — copy it as a starting point for a new route.
// See CLAUDE.md → "Add a new page" or .claude/skills/add-page/SKILL.md
const AboutPage = () => {
  return (
    <Card>
      <CardHeader title='เกี่ยวกับเรา' subheader='About' />
      <CardContent>
        <Typography>
          หน้านี้เป็นตัวอย่างหน้าเปล่า แก้ไขได้ที่ <code>src/app/(private)/about/page.tsx</code>
        </Typography>
      </CardContent>
    </Card>
  )
}

export default AboutPage
