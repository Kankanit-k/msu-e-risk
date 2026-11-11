// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import { accessLevelRank, requiredLevelFor } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

// Tag links that are viewable without login (driven by accessControl → publicRoutes).
const publicChip = { label: 'สาธารณะ', size: 'small', variant: 'outlined', color: 'success' } as const

const tagPublic = (items: VerticalMenuDataType[]): VerticalMenuDataType[] =>
  items.map(item => {
    if ('children' in item && item.children) {
      return { ...item, children: tagPublic(item.children) }
    }

    if ('href' in item && item.href && requiredLevelFor(item.href) === 'public') {
      return { ...item, suffix: publicChip }
    }

    return item
  })

/**
 * Sidebar menu — single source of truth.
 *
 * Shapes:
 *   • Section : { label, isSection: true, children: [...] }   → group heading
 *   • SubMenu : { label, icon, children: [...] }              → expandable group
 *   • Item    : { label, href, icon }                         → link
 *
 * Conventions (see CLAUDE.md → Access control):
 *   • Group items by purpose: "แดชบอร์ด" (dashboards), "ตาราง" (tables).
 *   • Keep routes shallow — aim for ≤ 3 path segments (e.g. /admin/users, /admin/university/units).
 *   • Admin pages live under /admin/** ; university-wide pages under /admin/university/**.
 *   • Sections are gated by the viewed `role` here AND enforced in middleware.
 */
const verticalMenuData = (role: AppRole = 'user'): VerticalMenuDataType[] => {
  const rank = accessLevelRank[role]

  const menu: VerticalMenuDataType[] = [
    // ── แดชบอร์ด / Dashboards (login) ───────────────────────────────
    {
      label: 'แดชบอร์ด',
      icon: 'ri-dashboard-line',
      isSection: true,
      children: [
        { label: 'หน้าแรก', href: '/', icon: 'ri-home-smile-line' },
        { label: 'โปรไฟล์ของฉัน', href: '/home', icon: 'ri-user-3-line' },
        { label: 'CRM', href: '/dashboards/crm', icon: 'ri-line-chart-line' },
        { label: 'Analytics', href: '/dashboards/analytics', icon: 'ri-bar-chart-box-line' }
      ]
    },

    // ── ตาราง / Tables (login) ──────────────────────────────────────
    {
      label: 'ตาราง',
      icon: 'ri-table-2',
      isSection: true,
      children: [
        { label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-table-line' },
        { label: 'คำขอ', href: '/requests', icon: 'ri-file-list-3-line' }
      ]
    }
  ]

  // ── ผู้ดูแลหน่วยงาน / Department admin (/admin/**) ───────────────────
  if (rank >= accessLevelRank.deptAdmin) {
    menu.push({
      label: 'ผู้ดูแลหน่วยงาน',
      icon: 'ri-shield-user-line',
      isSection: true,
      children: [
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: 'ri-shield-user-line' },
        { label: 'บันทึกการใช้งาน', href: '/admin/audit', icon: 'ri-history-line' }
      ]
    })
  }

  // ── ผู้ดูแลมหาวิทยาลัย / University admin (/admin/university/**) ──────
  if (rank >= accessLevelRank.universityAdmin) {
    menu.push({
      label: 'ผู้ดูแลมหาวิทยาลัย',
      icon: 'ri-government-line',
      isSection: true,
      children: [{ label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: 'ri-government-line' }]
    })
  }

  // ── อื่น ๆ / More (login) ───────────────────────────────────────────
  menu.push({
    label: 'อื่น ๆ',
    isSection: true,
    children: [{ label: 'เกี่ยวกับเรา', href: '/about', icon: 'ri-information-line' }]
  })

  // ── สาธิต / Demo (only when NEXT_PUBLIC_DEMO_MODE=true) ─────────────
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    menu.push({
      label: 'สาธิต',
      isSection: true,
      children: [{ label: 'จำลองสิทธิ์ (Demo)', href: '/demo', icon: 'ri-user-settings-line' }]
    })
  }

  return tagPublic(menu)
}

export default verticalMenuData
