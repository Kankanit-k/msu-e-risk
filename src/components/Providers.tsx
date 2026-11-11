// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Util Imports
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'

import ClientProviders from './ClientProviders'

type Props = ChildrenType & {
  direction: Direction
}

const Providers = async (props: Props) => {
  // Props
  const { children, direction } = props

  // Vars
  const mode = await getMode()
  const settingsCookie = await getSettingsFromCookie()
  const systemMode = await getSystemMode()

  return (
    <ClientProviders
      direction={direction}
      mode={mode}
      settingsCookie={settingsCookie}
      systemMode={systemMode}
    >
      {children}
    </ClientProviders>
  )
}

export default Providers
