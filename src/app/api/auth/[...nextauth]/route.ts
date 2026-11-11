import NextAuth from 'next-auth'

import type { StaffData } from '@/types/sessionTypes'

import { authOptions } from '@/libs/ErpAuth'

declare module 'next-auth' {
  interface Session {
    user: StaffData
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
