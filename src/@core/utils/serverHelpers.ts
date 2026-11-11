// Next Imports
import { cookies } from 'next/headers'

// Third-party Imports
import 'server-only'

// Type Imports
import type { Settings } from '@core/contexts/settingsContext'
import type { SystemMode } from '@core/types'

// Config Imports
import themeConfig from '@configs/themeConfig'
import { SIDEBAR_GROUPS_COOKIE } from '@configs/cookieConfig'

export const getSettingsFromCookie = async (): Promise<Settings> => {
  const cookieStore = await cookies()

  const cookieName = themeConfig.settingsCookieName

  return JSON.parse(cookieStore.get(cookieName)?.value || '{}')
}

export const getMode = async () => {
  const settingsCookie = await getSettingsFromCookie()

  // Get mode from cookie or fallback to theme config
  const _mode = settingsCookie.mode || themeConfig.mode

  return _mode
}

export const getSystemMode = async (): Promise<SystemMode> => {
  const cookieStore = await cookies()
  const mode = await getMode()

  const colorPrefCookie = (cookieStore.get('colorPref')?.value || 'light') as SystemMode

  return (mode === 'system' ? colorPrefCookie : mode) || 'light'
}

export const getServerMode = async () => {
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return mode === 'system' ? systemMode : mode
}

export const getSkin = async () => {
  const settingsCookie = await getSettingsFromCookie()

  return settingsCookie.skin || 'default'
}

// Sidebar groups the user folded (written client-side by VerticalMenu). Read on the server so the
// first render already matches — no flash of the default open state.

export const getClosedGroups = async (): Promise<string[]> => {
  const cookieStore = await cookies()

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieStore.get(SIDEBAR_GROUPS_COOKIE)?.value ?? '[]'))

    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : []
  } catch {
    return []
  }
}
