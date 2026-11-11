'use client'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Developer credits shown at the bottom of the sidebar.
// Replace the placeholder names below with the real ones.
type Developer = { emoji: string; name: string; role: string }

const developers: Developer[] = [
  { emoji: '👩', name: 'นางสาว######', role: 'กระบวนการ' },
  { emoji: '👨', name: 'นาย#######', role: 'ระบบ' }
]

const sectionLabelSx = {
  fontSize: '0.625rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'primary.main',
  marginBlockEnd: '8px'
} as const

const SidebarFooter = () => {
  // Hooks
  const { isCollapsed, isHovered, isBreakpointReached } = useVerticalNav()

  // Hide footer when the rail is collapsed (icon-only)
  const collapsedNotHovered = isCollapsed && !isHovered && !isBreakpointReached

  if (collapsedNotHovered) {
    return null
  }

  return (
    <Box
      sx={{
        marginBlockStart: 'auto',
        paddingInline: '16px',
        paddingBlock: '12px',
        borderBlockStart: '1px solid var(--mui-palette-divider)'
      }}
    >
      {/* Developer credits */}
      <Typography sx={sectionLabelSx}>ผู้พัฒนาระบบ</Typography>
      {developers.map(dev => (
        <Box
          key={dev.role}
          sx={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBlockEnd: '8px', '&:last-of-type': { marginBlockEnd: 0 } }}
        >
          <Box
            sx={{
              inlineSize: 26,
              blockSize: 26,
              flexShrink: 0,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              lineHeight: 1,
              backgroundColor: 'var(--mui-palette-primary-lightOpacity)'
            }}
          >
            {dev.emoji}
          </Box>
          <Box sx={{ minInlineSize: 0 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary' }}>
              {dev.name}
            </Typography>
            <Typography sx={{ fontSize: '0.625rem', lineHeight: 1.3, color: 'text.secondary' }}>
              {dev.role}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default SidebarFooter
