import { useSession, signIn, signOut } from 'next-auth/react'

import type { StaffData } from '@/types/sessionTypes'

export const useAuthUser = () => {
  const { data: session, status } = useSession()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  let validatedUser: StaffData | null = null

  if (!isLoading && isAuthenticated && session?.user) {
    const currentUser = session.user as StaffData

    // ตรวจสอบว่ามีข้อมูลผู้ใช้จาก ERP หรือไม่
    if (currentUser?.id || currentUser?.STAFFID) {
      validatedUser = currentUser
    }
  }

  return {
    isLoading,
    isAuthenticated,
    user: validatedUser
  }
}

export const useAuthMethod = () => {
  return {
    // Call only from a click handler; nothing may trigger sign-in from an effect or render
    login: () => signIn('erpauth', { callbackUrl: window.location.href }),
    logout: signOut
  }
}
