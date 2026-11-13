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

  // Starting point mirrors the old e-Risk system menu (HOME / ความเสี่ยง / ควบคุมภายใน / ตั้งค่าระบบ).
  const menu: VerticalMenuDataType[] = [
    {
      label: 'HOME',
      isSection: true,
      children: [{ label: 'Dashboard', href: '/', icon: 'ri-dashboard-line' }]
    },
    {
      label: 'ความเสี่ยง',
      isSection: true,
      children: [
        { label: 'SO', href: '/risk/so', icon: 'ri-star-line' },
        { label: 'เป้าประสงค์', href: '/risk/goals', icon: 'ri-focus-3-line' },
        { label: 'ERM1', href: '/risk/erm1', icon: 'ri-chat-search-line' },
        { label: 'ERM2 - 3', href: '/risk/erm2-3', icon: 'ri-record-circle-line' },
        { label: 'ERM4', href: '/risk/erm4', icon: 'ri-menu-2-line' }
      ]
    },
    {
      label: 'ควบคุมภายใน',
      isSection: true,
      children: [
        { label: 'ตั้งค่าข้อคำถาม', href: '/control/questions', icon: 'ri-equalizer-line' },
        { label: 'ภาคผนวก ก.', href: '/control/appendix-a', icon: 'ri-file-text-line' },
        { label: 'ปค. 4', href: '/control/pk4', icon: 'ri-file-list-2-line' },
        { label: 'ภาคผนวก ข.', href: '/control/appendix-b', icon: 'ri-file-text-line' },
        { label: 'ปค. 5', href: '/control/pk5', icon: 'ri-stack-line' },
        { label: 'แบบติดตาม ปค. 5', href: '/control/pk5-followup', icon: 'ri-clipboard-line' },
        { label: 'เอกสารเพื่อประเมินเบื้องต้น', href: '/control/documents', icon: 'ri-file-search-line' }
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

  // ── ตั้งค่าระบบ / System settings (กองแผนงาน = university admin) ─────
  if (rank >= accessLevelRank.universityAdmin) {
    menu.push({
      label: 'ตั้งค่าระบบ',
      isSection: true,
      children: [{ label: 'เปิด-ปิด ระบบ', href: '/admin/university/system', icon: 'ri-toggle-line' }]
    })
  }

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
