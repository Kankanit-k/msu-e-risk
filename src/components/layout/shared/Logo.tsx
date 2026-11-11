'use client'

// React Imports
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

// Third-party Imports
import styled from '@emotion/styled'

// Type Imports
import type { VerticalNavContextProps } from '@menu/contexts/verticalNavContext'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

type LogoTextProps = {
  isHovered?: VerticalNavContextProps['isHovered']
  isCollapsed?: VerticalNavContextProps['isCollapsed']
  transitionDuration?: VerticalNavContextProps['transitionDuration']
  isBreakpointReached?: VerticalNavContextProps['isBreakpointReached']
  color?: CSSProperties['color']
}

// Collapsible text block (title + subtitle) that hides when the nav is collapsed.
const LogoText = styled.div<LogoTextProps>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: ${({ transitionDuration }) =>
    `margin-inline-start ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`};

  ${({ isHovered, isCollapsed, isBreakpointReached }) =>
    !isBreakpointReached && isCollapsed && !isHovered
      ? 'opacity: 0; margin-inline-start: 0;'
      : 'opacity: 1; margin-inline-start: 10px;'}
`

const LogoOverline = styled.span`
  color: var(--mui-palette-text-secondary);
  font-size: 0.625rem;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
`

const LogoTitle = styled.span<{ color?: CSSProperties['color'] }>`
  color: ${({ color }) => color ?? 'var(--mui-palette-text-primary)'};
  font-family: var(--font-heading-latin), var(--font-heading-thai), 'Manrope', 'IBM Plex Sans Thai', sans-serif;
  font-size: 1.375rem;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
`

const LogoSubtitle = styled.span`
  color: var(--mui-palette-text-secondary);
  font-size: 0.75rem;
  line-height: 1.4;
  font-weight: 500;
  white-space: nowrap;
`

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  // Refs
  const logoTextRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { isHovered, transitionDuration, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()

  // Vars
  const { layout } = settings

  useEffect(() => {
    if (layout !== 'collapsed') {
      return
    }

    if (logoTextRef && logoTextRef.current) {
      if (!isBreakpointReached && layout === 'collapsed' && !isHovered) {
        logoTextRef.current?.classList.add('hidden')
      } else {
        logoTextRef.current.classList.remove('hidden')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, layout, isBreakpointReached])

  return (
    <div className='flex items-center min-bs-[24px]'>
      {/* Plain <img> (served from public/) — avoids next/image basePath issues */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${process.env.NEXT_PUBLIC_BASEPATH ?? ''}/images/logos/msu-logo.png`}
        alt={themeConfig.templateName}
        style={{ flexShrink: 0, objectFit: 'contain', blockSize: 22, inlineSize: 'auto' }}
      />
      <LogoText
        ref={logoTextRef}
        isHovered={isHovered}
        isCollapsed={layout === 'collapsed'}
        transitionDuration={transitionDuration}
        isBreakpointReached={isBreakpointReached}
      >
        {themeConfig.templateOverline ? <LogoOverline>{themeConfig.templateOverline}</LogoOverline> : null}
        <LogoTitle color={color}>{themeConfig.templateName}</LogoTitle>
        {themeConfig.templateSubtitle ? <LogoSubtitle>{themeConfig.templateSubtitle}</LogoSubtitle> : null}
      </LogoText>
    </div>
  )
}

export default Logo
