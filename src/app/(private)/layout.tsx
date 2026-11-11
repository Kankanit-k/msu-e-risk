// MUI Imports
import Button from '@mui/material/Button'

// Type Imports
import type { ChildrenType } from '@core/types'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'

// Component Imports
import Providers from '@components/Providers'
import DemoBanner from '@components/DemoBanner'
import Navigation from '@components/layout/vertical/Navigation'
import Header from '@components/layout/horizontal/Header'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import ScrollToTop from '@core/components/scroll-to-top'
import Customizer from '@core/components/customizer'

// Util Imports
import { getMode, getSystemMode, getClosedGroups } from '@core/utils/serverHelpers'

const Layout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars
  const direction = 'ltr'
  const mode = await getMode()
  const systemMode = await getSystemMode()
  const closedGroups = await getClosedGroups()

  return (
    <Providers direction={direction}>
      <DemoBanner />
      <LayoutWrapper
        systemMode={systemMode}
        verticalLayout={
          <VerticalLayout navigation={<Navigation mode={mode} closedGroups={closedGroups} />} navbar={<Navbar />} footer={<VerticalFooter />}>
            {children}
          </VerticalLayout>
        }
        horizontalLayout={
          <HorizontalLayout header={<Header />} footer={<HorizontalFooter />}>
            {children}
          </HorizontalLayout>
        }
      />
      <Customizer dir={direction} disableDirection />
      <ScrollToTop className='mui-fixed'>
        <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
          <i className='ri-arrow-up-line' />
        </Button>
      </ScrollToTop>
    </Providers>
  )
}

export default Layout
