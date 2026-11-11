// React Imports
import { useState } from 'react'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu } from '@menu/vertical-menu'
import { GenerateVerticalMenu } from '@components/GenerateMenu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useRole } from '@/hooks/useRole'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

// Menu Data Imports
import verticalMenuData from '@/data/navigation/verticalMenuData'

// Config Imports
import { COOKIE_PATH, SIDEBAR_GROUPS_COOKIE } from '@configs/cookieConfig'

// Labels of sidebar groups the user has folded are stored in a cookie (not localStorage) so the
// server renders the same state — see getClosedGroups in serverHelpers.

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
  initialClosedGroups?: string[]
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu, initialClosedGroups = [] }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const { role } = useRole()

  const [closedGroups, setClosedGroups] = useState<string[]>(initialClosedGroups)

  const handleGroupToggle = (label: string, open: boolean) => {
    setClosedGroups(prev => {
      const next = open ? prev.filter(l => l !== label) : [...new Set([...prev, label])]

      document.cookie = `${SIDEBAR_GROUPS_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=${COOKIE_PATH}; max-age=31536000; samesite=lax`

      return next
    })
  }

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu — data-driven from src/data/navigation/verticalMenuData.tsx */}
      <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <GenerateVerticalMenu
          menuData={verticalMenuData(role)}
          closedGroups={closedGroups}
          onGroupToggle={handleGroupToggle}
        />
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
