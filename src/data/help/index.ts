// How-to content per page — the single source for the in-app tour, the /manual page, the
// generated screenshots/video (scripts/manual) and the chatbot's get_help tool.
// Key = route without basePath. Add an entry whenever you add a page (see docs/manual.md).
export type HelpStep = {

  /** CSS selector the step points at, e.g. '[data-tour="chat"]'. No target → centered step. */
  target?: string
  title: string

  /** Shown in the tour and the manual, and read aloud in the video — keep it to 1–2 sentences. */
  body: string

  /**
   * Opt-in interactive step: the tour waits for the user to do it instead of showing "ถัดไป".
   * 'click' → advance when the target is clicked; 'input' → when the target field gets a non-empty value.
   * Leave it out (the default) for a normal, skippable step.
   */
  waitFor?: 'click' | 'input'
}

export type PageHelp = { title: string; summary: string; steps: HelpStep[] }

// Shell steps shared by every page.
const shell: HelpStep[] = [
  { target: '.ts-vertical-nav-root', title: 'เมนูด้านซ้าย', body: 'เลือกหน้าที่ต้องการจากเมนูนี้ กดชื่อหมวดเพื่อพับหรือขยายรายการ' },
  { target: '[data-tour="chat"]', title: 'ผู้ช่วย AI', body: 'กดเพื่อถามวิธีใช้งานหรือสั่งงานระบบด้วยภาษาไทย รายการที่แก้ไขข้อมูลต้องให้คุณกดยืนยันเองเสมอ' },
  { target: '[data-tour="profile"]', title: 'เมนูโปรไฟล์', body: 'ดูการเชื่อมต่อของคุณ เปิดคู่มือ หรือออกจากระบบได้จากเมนูนี้' },
  { target: '[data-tour="tour"]', title: 'ดูคำแนะนำอีกครั้ง', body: 'กดปุ่มนี้เมื่อไรก็ได้เพื่อเล่นคำแนะนำของหน้าที่เปิดอยู่' }
]

export const helpByPage: Record<string, PageHelp> = {
  '/home': {
    title: 'ข้อมูลของฉัน',
    summary: 'แสดงข้อมูลโปรไฟล์ของบัญชีที่เข้าสู่ระบบอยู่',
    steps: [
      { title: 'ยินดีต้อนรับ', body: 'หน้านี้แสดงข้อมูลโปรไฟล์ของคุณจาก ERP กดถัดไปเพื่อดูส่วนสำคัญของหน้าจอ หรือกดข้ามได้ทุกเมื่อ' },
      ...shell
    ]
  },
  '/': {
    title: 'หน้าแรก',
    summary: 'ข้อมูลสรุปที่เปิดให้ทุกคนดู และทางเข้าสู่ระบบสำหรับบุคลากร',
    steps: [
      { title: 'ยินดีต้อนรับ', body: 'หน้านี้แสดงข้อมูลสรุปที่ทุกคนดูได้ โดยไม่ต้องเข้าสู่ระบบ กดถัดไปเพื่อดูส่วนสำคัญ' },
      { target: '[data-tour="kpis"]', title: 'ตัวเลขสรุป', body: 'ตัวเลขในการ์ดเป็นข้อมูลตัวอย่างเพื่อแสดงรูปแบบ' },
      { target: '[data-tour="public-reports"]', title: 'รายงานสาธารณะ', body: 'กดเปิดดูรายงานที่เปิดให้ทุกคนเข้าถึงได้' },
      ...shell
    ]
  },
  '/admin/audit': {
    title: 'บันทึกการใช้งาน',
    summary: 'ดูว่าใครแก้ไขข้อมูลหรืออัปโหลดไฟล์อะไร เมื่อไร และเปลี่ยนจากค่าใดเป็นค่าใด',
    steps: [
      { target: '[data-tour="audit-filter"]', title: 'กรองรายการ', body: 'เลือกเดือน แล้วพิมพ์รหัสผู้ใช้หรือชื่อการกระทำ เช่น file.upload แล้วกดค้นหา' },
      { target: '[data-tour="audit-table"]', title: 'รายการล่าสุดอยู่บนสุด', body: 'แต่ละแถวแสดงผู้กระทำ การกระทำ รายการที่ถูกแก้ และค่าที่เปลี่ยน ค่าที่เป็นความลับถูกซ่อนไว้เสมอ' }
    ]
  },
  '/connections': {
    title: 'การเชื่อมต่อของฉัน',
    summary: 'ดูและยกเลิกสิทธิ์ของ chatbot หรือแอปที่ทำงานแทนคุณ',
    steps: [
      { target: '[data-tour="connections"]', title: 'รายการการเชื่อมต่อ', body: 'แต่ละรายการคือ chatbot ที่คุณอนุญาตไว้ พร้อมสิทธิ์และเวลาที่ใช้ล่าสุด' },
      { target: '[data-tour="connections"]', title: 'ยกเลิกการเชื่อมต่อ', body: 'กดยกเลิกเพื่อหยุดสิทธิ์ของ chatbot นั้นทันที ระบบจะถามยืนยันก่อนเสมอ' }
    ]
  },
  '/requests': {
    title: 'คำขอ',
    summary: 'ยื่นคำขอ ติดตามสถานะ และอนุมัติคำขอ (ผู้ดูแลเท่านั้นที่อนุมัติได้)',
    steps: [
      { target: '[data-tour="requests-create"]', title: 'สร้างคำขอ', body: 'กดเพื่อกรอกคำขอใหม่ ระบบบันทึกเป็นร่างไว้ก่อน และจำข้อมูลที่กรอกค้างไว้ให้แม้ปิดหน้าต่าง' },
      { target: '[data-tour="requests-filter"]', title: 'ค้นหาและกรอง', body: 'พิมพ์คำค้นหรือเลือกสถานะและประเภท ตัวกรองอื่นอยู่ใต้ปุ่มตัวกรองเพิ่มเติม' },
      { target: '[data-tour="requests-table"]', title: 'รายการคำขอ', body: 'กดที่แถวเพื่อดูขั้นตอน ส่งคำขอ หรืออนุมัติ กดหัวคอลัมน์เพื่อเรียงลำดับ' },
      { target: '[data-tour="requests-export"]', title: 'ส่งออกและพิมพ์', body: 'ส่งออกรายการที่กรองอยู่เป็นไฟล์ Excel หรือพิมพ์เป็นรายงาน เลือกบันทึกเป็น PDF ได้จากหน้าต่างพิมพ์' }
    ]
  }
}

/** Help for a pathname from usePathname() (no basePath; trailing slash tolerated). */
export const helpFor = (pathname: string | null) => {
  const path = (pathname ?? '/').replace(/\/+$/, '') || '/'

  return helpByPage[path] ? { path, help: helpByPage[path] } : null
}

/** File-safe name for a page's generated assets: '/home' → 'home', '/admin/users' → 'admin-users'. */
export const manualSlug = (path: string) => path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'index'
