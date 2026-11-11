// MUI Imports
import type { Theme } from '@mui/material/styles'

// Type Imports
import type { Settings } from '@core/contexts/settingsContext'
import type { Skin, SystemMode } from '@core/types'

// Theme Options Imports
import overrides from './overrides'
import colorSchemes from './colorSchemes'
import spacing from './spacing'
import shadows from './shadows'
import customShadows from './customShadows'

// Font Imports (Sarabun body + Manrope/IBM Plex Sans Thai headings) — see ./fonts
import { bodyFontFamily, headingFontFamily } from './fonts'

const theme = (settings: Settings, mode: SystemMode, direction: Theme['direction']): Theme => {
  return {
    direction,
    components: overrides(settings.skin as Skin),
    colorSchemes: colorSchemes(settings.skin as Skin),
    ...spacing,
    shape: {
      borderRadius: 6,
      customBorderRadius: {
        xs: 2,
        sm: 4,
        md: 6,
        lg: 8,
        xl: 10
      }
    },
    shadows: shadows(mode),

    typography: {
      // Body / UI text → Sarabun. Headings → Manrope + IBM Plex Sans Thai (see ./fonts).
      fontFamily: bodyFontFamily,

      // Compact 14px base, matching the MSU-BEPS reference.
      fontSize: 14,
      h1: {
        fontFamily: headingFontFamily,
        fontSize: '2.875rem',
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: '-0.02em'
      },
      h2: {
        fontFamily: headingFontFamily,
        fontSize: '2.375rem',
        fontWeight: 800,
        lineHeight: 1.25,
        letterSpacing: '-0.02em'
      },
      h3: {
        fontFamily: headingFontFamily,
        fontSize: '1.75rem',
        fontWeight: 700,
        lineHeight: 1.35,
        letterSpacing: '-0.01em'
      },
      h4: {
        fontFamily: headingFontFamily,
        fontSize: '1.5rem',
        fontWeight: 700,
        lineHeight: 1.4
      },
      h5: {
        fontFamily: headingFontFamily,
        fontSize: '1.125rem',
        fontWeight: 700,
        lineHeight: 1.5
      },
      h6: {
        fontFamily: headingFontFamily,
        fontSize: '0.9375rem',
        fontWeight: 700,
        lineHeight: 1.46667
      },
      subtitle1: {
        fontSize: '0.9375rem',
        lineHeight: 1.46667
      },
      subtitle2: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1.53846154
      },
      body1: {
        fontSize: '0.9375rem',
        lineHeight: 1.6
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.6
      },
      button: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        lineHeight: 1.46667,
        textTransform: 'none'
      },
      caption: {
        fontSize: '0.8125rem',
        lineHeight: 1.38462,
        letterSpacing: '0.4px'
      },
      overline: {
        fontSize: '0.75rem',
        lineHeight: 1.16667,
        letterSpacing: '0.8px'
      }
    },
    customShadows: customShadows(mode),
    mainColorChannels: {
      light: '46 38 61',
      dark: '231 227 252',
      lightShadow: '46 38 61',
      darkShadow: '19 17 32'
    }
  } as Theme
}

export default theme
