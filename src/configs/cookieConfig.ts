// Client-safe cookie settings shared by the theme cookie and the sidebar-groups cookie.
import themeConfig from './themeConfig'

// Scope cookies to this system's basePath so sibling systems on the same host stay independent.
const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? ''

export const COOKIE_PATH = basePath.startsWith('/') ? basePath : '/'

export const SIDEBAR_GROUPS_COOKIE = `${themeConfig.settingsCookieName.replace(/-settings$/, '')}-sidebar-groups`
