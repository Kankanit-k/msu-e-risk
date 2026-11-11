// MUI Imports
import type { Theme } from '@mui/material/styles'

// Type Imports
import type { VerticalNavState } from '@menu/contexts/verticalNavContext'
import type { MenuProps } from '@menu/vertical-menu'

// Util Imports
import { menuClasses } from '@menu/utils/menuClasses'

const menuSectionStyles = (verticalNavOptions: VerticalNavState, theme: Theme): MenuProps['menuSectionStyles'] => {
  // Vars
  const { isCollapsed, isHovered, collapsedWidth } = verticalNavOptions

  const collapsedNotHovered = isCollapsed && !isHovered

  return {
    root: {
      marginBlockStart: theme.spacing(6),
      [`& .${menuClasses.menuSectionContent}`]: {
        color: 'var(--mui-palette-primary-main)',
        paddingInline: '0 !important',
        paddingBlock: `${theme.spacing(collapsedNotHovered ? 3.875 : 1.5)} !important`,
        gap: theme.spacing(2.5),
        ...(collapsedNotHovered && {
          paddingInlineStart: `${theme.spacing(((collapsedWidth as number) - 22) / 8)} !important`,
          paddingInlineEnd: `${theme.spacing((((collapsedWidth as number) - 22) / 2 - 5) / 4)} !important`
        }),

        // Show only a short divider tick when collapsed; full divider line otherwise.
        ...(collapsedNotHovered && {
          '&:before': {
            content: '""',
            blockSize: 1,
            inlineSize: '1.3125rem',
            backgroundColor: 'var(--mui-palette-divider)'
          }
        }),
        ...(!collapsedNotHovered && {
          '&:after': {
            content: '""',
            blockSize: 1,
            flexGrow: 1,
            backgroundColor: 'var(--mui-palette-divider)'
          }
        })
      },

      // Uppercase, letter-spaced, primary-coloured section label (MSU-BEPS `.sb-group`)
      [`& .${menuClasses.menuSectionLabel}`]: {
        flexGrow: 0,
        fontSize: '0.6875rem',
        fontWeight: 800,
        lineHeight: 1.4,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--mui-palette-primary-main)',
        ...(collapsedNotHovered && {
          display: 'none'
        })
      }
    }
  }
}

export default menuSectionStyles
