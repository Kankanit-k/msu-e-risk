// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'
import { accessLevelRank } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

// Mirrors src/data/navigation/verticalMenuData.tsx (horizontal layout uses sub-menus, no sections).
const horizontalMenuData = (role: AppRole = 'user'): HorizontalMenuDataType[] => {
  const rank = accessLevelRank[role]

  const menu: HorizontalMenuDataType[] = [
    { label: 'Dashboard', href: '/', icon: 'ri-dashboard-line' },
    {
      label: 'ความเสี่ยง',
      icon: 'ri-shield-flash-line',
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
      icon: 'ri-shield-check-line',
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
    menu.push({
      label: 'ตั้งค่าระบบ',
      icon: 'ri-settings-3-line',
      children: [{ label: 'เปิด-ปิด ระบบ', href: '/admin/university/system', icon: 'ri-toggle-line' }]
    })
  }

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
