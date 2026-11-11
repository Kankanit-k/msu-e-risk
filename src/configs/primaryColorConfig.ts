export type PrimaryColorConfig = {
  name?: string
  light?: string
  main: string
  dark?: string
}

// Primary color config object.
// NOTE: the FIRST entry is the template default (see settingsContext → primaryColor).
const primaryColorConfig: PrimaryColorConfig[] = [
  {
    name: 'primary-msu',
    light: '#8B6FFF',
    main: '#6D4CFF', // MSU-BEPS purple accent
    dark: '#5938E0'
  },
  {
    name: 'primary-5',
    light: '#5CAFF1',
    main: '#2092EC',
    dark: '#176BAC'
  },
  {
    name: 'primary-1',
    light: '#4EB0B1',
    main: '#0D9394',
    dark: '#096B6C'
  },
  {
    name: 'primary-2',
    light: '#A379FF',
    main: '#8C57FF',
    dark: '#7E4EE6'
  },
  {
    name: 'primary-3',
    light: '#F0718D',
    main: '#EB3D63',
    dark: '#AC2D48'
  },
  {
    name: 'primary-4',
    light: '#FFC25A',
    main: '#FFAB1D',
    dark: '#BA7D15'
  }
]

export default primaryColorConfig
