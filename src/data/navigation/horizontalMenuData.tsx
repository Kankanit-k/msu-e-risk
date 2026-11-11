// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'
import { accessLevelRank } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

// Mirrors src/data/navigation/verticalMenuData.tsx (horizontal layout uses sub-menus, no sections).
const horizontalMenuData = (role: AppRole = 'user'): HorizontalMenuDataType[] => {
  const rank = accessLevelRank[role]

  const menu: HorizontalMenuDataType[] = [
    {
      label: 'แดชบอร์ด',
      icon: 'ri-dashboard-line',
      children: [
        { label: 'หน้าแรก', href: '/', icon: 'ri-home-smile-line' },
        { label: 'โปรไฟล์ของฉัน', href: '/home', icon: 'ri-user-3-line' },
        { label: 'CRM', href: '/dashboards/crm', icon: 'ri-line-chart-line' },
        { label: 'Analytics', href: '/dashboards/analytics', icon: 'ri-bar-chart-box-line' }
      ]
    },
    {
      label: 'ตาราง',
      icon: 'ri-table-line',
      children: [
        { label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-table-line' },
        { label: 'คำขอ', href: '/requests', icon: 'ri-file-list-3-line' }
      ]
    }
  ]

  if (rank >= accessLevelRank.deptAdmin) {
    menu.push({
      label: 'ผู้ดูแลหน่วยงาน',
      icon: 'ri-shield-user-line',
      children: [
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: 'ri-shield-user-line' },
        { label: 'บันทึกการใช้งาน', href: '/admin/audit', icon: 'ri-history-line' }
      ]
    })
  }

  if (rank >= accessLevelRank.universityAdmin) {
    menu.push({
      label: 'ผู้ดูแลมหาวิทยาลัย',
      icon: 'ri-government-line',
      children: [{ label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: 'ri-government-line' }]
    })
  }

  menu.push({ label: 'เกี่ยวกับเรา', href: '/about', icon: 'ri-information-line' })

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    menu.push({
      label: 'สาธิต',
      icon: 'ri-user-settings-line',
      children: [{ label: 'จำลองสิทธิ์ (Demo)', href: '/demo', icon: 'ri-user-settings-line' }]
    })
  }

  return menu
}

export default horizontalMenuData
