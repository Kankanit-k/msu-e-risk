'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

// Auth Imports
import { useSession } from 'next-auth/react'

// Config Imports
import { accessLevelRank } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

/**
 * Client-side role switching for the template.
 *
 *  - `role`      : the currently *viewed* role, persisted in localStorage and clamped to the real role.
 *  - `setRole`   : switch the viewed role (used by the profile menu). Requests above the real role are clamped.
 *  - `useIsAdmin`: whether the signed-in account may switch roles at all — gates the toggle.
 *
 * The real role comes from the NextAuth session (`session.role`, falling back to `session.user.role`).
 * Anonymous visitors and plain users count as 'user'. Demo personas carry the same field.
 *
 * This only controls what the UI *shows*. Real enforcement lives in
 * src/middleware.ts + src/configs/accessControl.ts.
 */
export type { AppRole }

const STORAGE_KEY = 'app-view-role'
const ROLE_EVENT = 'app-view-role-change'
const VALID_ROLES: AppRole[] = ['user', 'deptAdmin', 'universityAdmin']

// A viewed role may never rank above the real role (deptAdmin cannot view as universityAdmin).
const clampRole = (requested: AppRole, real: AppRole): AppRole =>
  accessLevelRank[requested] > accessLevelRank[real] ? real : requested

const readSessionRole = (session: unknown): unknown => {
  const s = session as { role?: unknown; user?: { role?: unknown } } | null

  return s?.role ?? s?.user?.role
}

// The signed-in account's own role. Anonymous, loading and plain users resolve to 'user'.
const useRealRole = (): AppRole => {
  const { data: session } = useSession()
  const sessionRole = readSessionRole(session)

  return sessionRole === 'deptAdmin' || sessionRole === 'universityAdmin' ? sessionRole : 'user'
}

export const useRole = () => {
  const realRole = useRealRole()

  // Default to 'user' on the server + first client render to avoid hydration mismatch.
  const [storedRole, setStoredRole] = useState<AppRole>('user')

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(STORAGE_KEY) as AppRole | null

      if (stored && VALID_ROLES.includes(stored)) {
        setStoredRole(stored)
      }
    }

    read()
    window.addEventListener(ROLE_EVENT, read)
    window.addEventListener('storage', read)

    return () => {
      window.removeEventListener(ROLE_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])

  const setRole = useCallback(
    (next: AppRole) => {
      const allowed = clampRole(next, realRole)

      localStorage.setItem(STORAGE_KEY, allowed)
      setStoredRole(allowed)
      window.dispatchEvent(new Event(ROLE_EVENT))
    },
    [realRole]
  )

  return { role: clampRole(storedRole, realRole), setRole }
}

// True only for accounts whose real role is a DEPT or UNIVERSITY admin.
export const useIsAdmin = (): boolean => {
  const realRole = useRealRole()

  return realRole === 'deptAdmin' || realRole === 'universityAdmin'
}
