'use client'

import { SessionProvider } from 'next-auth/react'

import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import AppReactToastify from '@/libs/styles/AppReactToastify'

type Props = {
  children: React.ReactNode
  direction: any
  settingsCookie: any
  mode: any
  systemMode: any
}

const ClientProviders = ({
  children,
  direction,
  settingsCookie,
  mode,
  systemMode
}: Props) => {
  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASEPATH || '/digitalplan'}/api/auth`}>
      <VerticalNavProvider>
        <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
          <ThemeProvider direction={direction} systemMode={systemMode}>
            {children}
            <AppReactToastify hideProgressBar />
          </ThemeProvider>
        </SettingsProvider>
      </VerticalNavProvider>
    </SessionProvider>
  )
}

export default ClientProviders
