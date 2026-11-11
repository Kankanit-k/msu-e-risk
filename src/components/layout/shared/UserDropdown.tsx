'use client'

// React Imports
import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Auth Imports
import { signIn } from 'next-auth/react'

// MUI Imports
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import { useAuthUser, useAuthMethod } from '@/hooks/AuthHooks'
import { useRole, useIsAdmin } from '@/hooks/useRole'
import type { AppRole } from '@/configs/accessControl'

const roleOptions: { value: AppRole; label: string; icon: string }[] = [
  { value: 'user', label: 'ผู้ใช้ทั่วไป', icon: 'ri-user-line' },
  { value: 'deptAdmin', label: 'ผู้ดูแลหน่วยงาน', icon: 'ri-shield-user-line' },
  { value: 'universityAdmin', label: 'ผู้ดูแลมหาวิทยาลัย', icon: 'ri-government-line' }
]

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

// Styled component for badge content
const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()
  const { user, isLoading } = useAuthUser()
  const { logout } = useAuthMethod()

  const { settings } = useSettings()
  const { role, setRole } = useRole()
  const isAdmin = useIsAdmin()

  // Anonymous = session resolved and no ERP user; login starts only from the button below
  const isAnonymous = !isLoading && !user
  const avatarSrc = user?.STAFFID ? `https://pd.msu.ac.th/staff/picture/${user.STAFFID}.jpg` : undefined

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = () => {
    logout({ callbackUrl: `${window.location.origin}${basePath}/` })
  }

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
        data-tour='profile'
      >
        <Avatar
          ref={anchorRef}
          alt={isAnonymous ? 'ผู้เยี่ยมชม' : user?.STAFFNAME || 'User'}
          src={isAnonymous ? undefined : avatarSrc}
          onClick={handleDropdownOpen}
          className='cursor-pointer bs-[38px] is-[38px]'
        >
          {isAnonymous && <i className='ri-user-3-line' />}
        </Avatar>
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-4 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  {isAnonymous ? (
                    <>
                      <div className='flex items-center plb-2 pli-4 gap-2' tabIndex={-1}>
                        <Avatar alt='ผู้เยี่ยมชม'>
                          <i className='ri-user-3-line' />
                        </Avatar>
                        <div className='flex items-start flex-col'>
                          <Typography className='font-medium' color='text.primary'>
                            ผู้เยี่ยมชม
                          </Typography>
                          <Typography variant='caption'>ยังไม่ได้เข้าสู่ระบบ</Typography>
                        </div>
                      </div>
                      <Divider className='mlb-1' />
                      <div className='flex items-center plb-2 pli-4'>
                        <Button
                          fullWidth
                          variant='contained'
                          color='primary'
                          size='small'
                          endIcon={<i className='ri-login-box-line' />}
                          onClick={() => signIn('erpauth', { callbackUrl: window.location.href })}
                          sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                        >
                          เข้าสู่ระบบด้วย ERP มมส
                        </Button>
                      </div>
                      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
                        <MenuItem component={Link} href='/demo' className='gap-3' onClick={e => handleDropdownClose(e)}>
                          <i className='ri-user-star-line' />
                          <Typography color='text.primary'>ตัวอย่างสิทธิ์ (Demo)</Typography>
                        </MenuItem>
                      )}
                    </>
                  ) : (
                    <>
                      <div className='flex items-center plb-2 pli-4 gap-2' tabIndex={-1}>
                        <Avatar alt={user?.STAFFNAME || 'User'} src={avatarSrc} />
                        <div className='flex items-start flex-col'>
                          <Typography className='font-medium' color='text.primary'>
                            {user?.STAFFNAME} {user?.STAFFSURNAME}
                          </Typography>
                          <Typography variant='caption'>{user?.SCOPES?.groupname}</Typography>
                        </div>
                      </div>
                      <Divider className='mlb-1' />
                      {/* Role switcher — only for accounts that may switch (see useIsAdmin) */}
                      {isAdmin && [
                        <Typography key='role-label' variant='caption' className='block pli-4 plb-1' color='primary.main'>
                          มุมมองสิทธิ์
                        </Typography>,
                        ...roleOptions.map(opt => (
                          <MenuItem key={opt.value} className='gap-3' selected={role === opt.value} onClick={() => setRole(opt.value)}>
                            <i className={opt.icon} />
                            <Typography color='text.primary' className='flex-1'>
                              {opt.label}
                            </Typography>
                            {role === opt.value && <i className='ri-check-line text-primary' />}
                          </MenuItem>
                        )),
                        <Divider key='role-divider' className='mlb-1' />
                      ]}
                      <MenuItem className='gap-3' onClick={e => handleDropdownClose(e)}>
                        <i className='ri-user-3-line' />
                        <Typography color='text.primary'>My Profile</Typography>
                      </MenuItem>
                      <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/connections')}>
                        <i className='ri-links-line' />
                        <Typography color='text.primary'>การเชื่อมต่อของฉัน</Typography>
                      </MenuItem>
                      <MenuItem className='gap-3' onClick={e => handleDropdownClose(e, '/manual')}>
                        <i className='ri-book-open-line' />
                        <Typography color='text.primary'>คู่มือการใช้งาน</Typography>
                      </MenuItem>
                      <MenuItem className='gap-3' onClick={e => handleDropdownClose(e)}>
                        <i className='ri-settings-4-line' />
                        <Typography color='text.primary'>Settings</Typography>
                      </MenuItem>
                      <MenuItem className='gap-3' onClick={e => handleDropdownClose(e)}>
                        <i className='ri-money-dollar-circle-line' />
                        <Typography color='text.primary'>Pricing</Typography>
                      </MenuItem>
                      <MenuItem className='gap-3' onClick={e => handleDropdownClose(e)}>
                        <i className='ri-question-line' />
                        <Typography color='text.primary'>FAQ</Typography>
                      </MenuItem>
                      <div className='flex items-center plb-2 pli-4'>
                        <Button
                          fullWidth
                          variant='contained'
                          color='error'
                          size='small'
                          endIcon={<i className='ri-logout-box-r-line' />}
                          onClick={handleUserLogout}
                          sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                        >
                          Logout
                        </Button>
                      </div>
                    </>
                  )}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
