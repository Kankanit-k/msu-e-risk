import 'server-only'

// Type Imports
import type { AppRole } from '@configs/accessControl'

// Server-side role catalog for real ERP accounts. Lists come from the environment (STAFFIDs,
// comma separated). Anyone not listed is a regular 'user'. The university list wins over the
// department list when a STAFFID appears in both.

const parseStaffIds = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)

/** Resolve the application role for an ERP STAFFID (called from the NextAuth jwt callback). */
export const resolveRoleForStaff = (staffId: string): AppRole => {
  const id = staffId.trim()

  if (!id) {
    return 'user'
  }

  if (parseStaffIds(process.env.ROLE_UNIVERSITY_ADMINS).includes(id)) {
    return 'universityAdmin'
  }

  if (parseStaffIds(process.env.ROLE_DEPT_ADMINS).includes(id)) {
    return 'deptAdmin'
  }

  return 'user'
}
