// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import ErrorReporter from '@components/ErrorReporter'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Font Imports
import { fontVariables } from '@core/theme/fonts'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

// Browser-tab title comes from themeConfig — rename the system there, not here.
// Pages set only their own name (`title: 'รายงาน'`) → "รายงาน | MSU-<ABBR>".
export const metadata = {
  title: {
    default: `${themeConfig.templateName} — ${themeConfig.templateSubtitle}`,
    template: `%s | ${themeConfig.templateName}`
  },
  description: `${themeConfig.templateSubtitle} — ${themeConfig.templateOverline}`
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='th' dir={direction} suppressHydrationWarning>
      <body className={`${fontVariables} flex is-full min-bs-full flex-auto flex-col`}>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        <ErrorReporter />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
