/**
 * Role catalog — single source for the docs, the role simulator (/demo) and the permission table.
 *
 * Tiers and route rules live in src/configs/accessControl.ts; this file describes the roles in words,
 * the demo identities used by /api/demo/session, and a feature-by-feature permission matrix.
 *
 * All personas are fictional (invented names, STAFFID values that start with 'DEMO-', example.com emails).
 * They never correspond to a real staff member.
 */

// Config Imports
import type { AccessLevel, AppRole } from '@/configs/accessControl'

// 'guest' is the anonymous visitor (level 'public'); the other ids are the signed-in roles.
export type RoleId = 'guest' | AppRole

export type DemoPersona = {

  // Demo STAFFID ('DEMO-001' ...). null for the guest, who has no account.
  staffId: string | null
  staffName: string
  staffSurname: string
  email: string
  position: string
  unit: string
}

export type RoleDefinition = {
  id: RoleId
  level: AccessLevel
  label: string
  description: string
  icon: string
  can: string[]
  persona: DemoPersona
}

export type PermissionMatrixRow = {
  feature: string
  minLevel: AccessLevel
}

export type DemoPersonaCard = {
  roleId: RoleId
  label: string
  description: string
  icon: string
  can: string[]
  persona: DemoPersona
}

export const roles: RoleDefinition[] = [
  {
    id: 'guest',
    level: 'public',
    label: 'ผู้เยี่ยมชม (ไม่เข้าสู่ระบบ)',
    description: 'บุคคลทั่วไปที่เข้าชมระบบโดยไม่มีบัญชี ดูได้เฉพาะข้อมูลและหน้าที่เปิดเป็นสาธารณะ',
    icon: 'ri-eye-line',
    can: [
      'ดูหน้าแรกและข้อมูลสรุปสาธารณะ',
      'ดูแดชบอร์ดวิเคราะห์และหน้ารายชื่อที่เปิดเป็นสาธารณะ',
      'ไม่สามารถบันทึกข้อมูลหรือส่งคำขอได้'
    ],
    persona: {
      staffId: null,
      staffName: 'ผู้เยี่ยมชม',
      staffSurname: '',
      email: '',
      position: 'ไม่ได้เข้าสู่ระบบ',
      unit: '-'
    }
  },
  {
    id: 'user',
    level: 'user',
    label: 'ผู้ใช้งานทั่วไป (บุคลากร)',
    description: 'บุคลากรที่เข้าสู่ระบบด้วยบัญชี ERP ใช้งานฟีเจอร์ประจำตัวและดูข้อมูลที่เกี่ยวข้องกับตนเอง',
    icon: 'ri-user-line',
    can: [
      'ทุกสิทธิ์ของผู้เยี่ยมชม',
      'ดูแดชบอร์ด CRM และหน้าคำขอของตนเอง',
      'ดูหน้าโฮมส่วนตัวและเมนูของบัญชีตนเอง'
    ],
    persona: {
      staffId: 'DEMO-001',
      staffName: 'ทดลอง',
      staffSurname: 'หนึ่ง',
      email: 'demo-user@example.com',
      position: 'เจ้าหน้าที่ประสานงาน',
      unit: 'ฝ่ายตัวอย่าง A'
    }
  },
  {
    id: 'deptAdmin',
    level: 'deptAdmin',
    label: 'ผู้ดูแลหน่วยงาน/คณะ',
    description: 'ผู้รับผิดชอบข้อมูลของหน่วยงานหรือคณะ จัดการรายชื่อผู้ใช้และดูบันทึกการใช้งานภายในหน่วยงาน',
    icon: 'ri-team-line',
    can: [
      'ทุกสิทธิ์ของผู้ใช้งานทั่วไป',
      'จัดการรายชื่อผู้ใช้ในหน่วยงานหรือคณะ',
      'ดูบันทึกการใช้งานของหน่วยงานหรือคณะ'
    ],
    persona: {
      staffId: 'DEMO-002',
      staffName: 'ทดลอง',
      staffSurname: 'สอง',
      email: 'demo-dept-admin@example.com',
      position: 'หัวหน้าฝ่ายตัวอย่าง',
      unit: 'คณะตัวอย่าง B'
    }
  },
  {
    id: 'universityAdmin',
    level: 'universityAdmin',
    label: 'ผู้ดูแลระดับมหาวิทยาลัย',
    description: 'ผู้ดูแลระบบระดับมหาวิทยาลัย รับผิดชอบโครงสร้างหน่วยงานและสิทธิ์ของผู้ดูแลทั้งมหาวิทยาลัย',
    icon: 'ri-building-line',
    can: [
      'ทุกสิทธิ์ของผู้ดูแลหน่วยงานหรือคณะ',
      'จัดการโครงสร้างหน่วยงานระดับมหาวิทยาลัย',
      'กำหนดผู้ดูแลหน่วยงานหรือคณะ'
    ],
    persona: {
      staffId: 'DEMO-003',
      staffName: 'ทดลอง',
      staffSurname: 'สาม',
      email: 'demo-university-admin@example.com',
      position: 'ผู้ดูแลระบบส่วนกลาง',
      unit: 'สำนักงานตัวอย่างส่วนกลาง'
    }
  }
]

// Route-mirroring feature list: the minimum level needed to open each feature.
export const permissionMatrix: PermissionMatrixRow[] = [
  { feature: 'หน้าแรกและข้อมูลสรุป (/)', minLevel: 'public' },
  { feature: 'แดชบอร์ดวิเคราะห์ (/dashboards/analytics)', minLevel: 'public' },
  { feature: 'รายชื่อผู้ใช้ (/users)', minLevel: 'public' },
  { feature: 'แดชบอร์ด CRM (/dashboards/crm)', minLevel: 'user' },
  { feature: 'หน้าคำขอ (/requests)', minLevel: 'user' },
  { feature: 'จัดการผู้ใช้หน่วยงาน (/admin/users)', minLevel: 'deptAdmin' },
  { feature: 'บันทึกการใช้งาน (/admin/audit)', minLevel: 'deptAdmin' },
  { feature: 'จัดการหน่วยงานระดับมหาวิทยาลัย (/admin/university/units)', minLevel: 'universityAdmin' }
]

// Card view-model for the role simulator, derived from the catalog.
export const demoPersonas: DemoPersonaCard[] = roles.map(role => ({
  roleId: role.id,
  label: role.label,
  description: role.description,
  icon: role.icon,
  can: role.can,
  persona: role.persona
}))

/** Display name of a persona ("ทดลอง หนึ่ง"), empty parts dropped. */
export const personaFullName = (persona: DemoPersona): string =>
  [persona.staffName, persona.staffSurname].filter(Boolean).join(' ')
