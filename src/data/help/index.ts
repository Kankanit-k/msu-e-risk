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
  {
    target: '.ts-vertical-nav-root',
    title: 'เมนูด้านซ้าย',
    body: 'เลือกหน้าที่ต้องการจากเมนูนี้ กดชื่อหมวดเพื่อพับหรือขยายรายการ'
  },
  {
    target: '[data-tour="chat"]',
    title: 'ผู้ช่วย AI',
    body: 'กดเพื่อถามวิธีใช้งานหรือสั่งงานระบบด้วยภาษาไทย รายการที่แก้ไขข้อมูลต้องให้คุณกดยืนยันเองเสมอ'
  },
  {
    target: '[data-tour="profile"]',
    title: 'เมนูโปรไฟล์',
    body: 'ดูการเชื่อมต่อของคุณ เปิดคู่มือ หรือออกจากระบบได้จากเมนูนี้'
  },
  {
    target: '[data-tour="tour"]',
    title: 'ดูคำแนะนำอีกครั้ง',
    body: 'กดปุ่มนี้เมื่อไรก็ได้เพื่อเล่นคำแนะนำของหน้าที่เปิดอยู่'
  }
]

export const helpByPage: Record<string, PageHelp> = {
  '/home': {
    title: 'ข้อมูลของฉัน',
    summary: 'แสดงข้อมูลโปรไฟล์ของบัญชีที่เข้าสู่ระบบอยู่',
    steps: [
      {
        title: 'ยินดีต้อนรับ',
        body: 'หน้านี้แสดงข้อมูลโปรไฟล์ของคุณจาก ERP กดถัดไปเพื่อดูส่วนสำคัญของหน้าจอ หรือกดข้ามได้ทุกเมื่อ'
      },
      ...shell
    ]
  },
  '/': {
    title: 'ภาพรวมความเสี่ยง',
    summary: 'แดชบอร์ดสรุปความเสี่ยงของมหาวิทยาลัย ตามปีงบประมาณ รอบรายงาน และหน่วยงาน',
    steps: [
      {
        target: '[data-tour="risk-filters"]',
        title: 'เลือกปี รอบ และหน่วยงาน',
        body: 'ตัวเลขทั้งหน้าเปลี่ยนตามตัวกรองนี้ทันที ปุ่มส่งออก Excel มุมขวาบนดาวน์โหลดรายการความเสี่ยงตามตัวกรอง'
      },
      { target: '[data-tour="kpis"]', title: 'ตัวเลขสรุป', body: 'กดการ์ดเพื่อดูรายการที่อยู่เบื้องหลังตัวเลขนั้น' },
      {
        target: '[data-tour="heatmap"]',
        title: 'Risk Heatmap',
        body: 'แต่ละช่องคือโอกาส × ผลกระทบ สลับดูก่อนควบคุม (Inherent) หรือหลังควบคุม (Residual) แล้วกดช่องเพื่อดูความเสี่ยงในช่องนั้น'
      },
      {
        target: '[data-tour="tasks"]',
        title: 'งานที่ต้องดำเนินการ',
        body: 'รายการที่รอเห็นชอบ รอรับรอง ถูกตีกลับ หรือต้องเร่งติดตาม'
      },
      ...shell
    ]
  },
  '/risk/so': {
    title: 'SO — วัตถุประสงค์เชิงกลยุทธ์',
    summary: 'จัดการวัตถุประสงค์เชิงกลยุทธ์ของแต่ละหน่วยงานตามปีงบประมาณ ดึงจากระบบ PMS หรือเพิ่มเอง',
    steps: [
      {
        target: '[data-tour="so-filter"]',
        title: 'เลือกปีและหน่วยงาน',
        body: 'รายการด้านล่างเปลี่ยนตามปีงบประมาณและคณะ/หน่วยงานที่เลือกทันที'
      },
      {
        target: '[data-tour="so-actions"]',
        title: 'เพิ่ม SO',
        body: 'ดึงจาก PMS เพื่อเลือก SO ที่กรอกไว้แล้ว เพิ่มใหม่เอง หรือนำเข้าจากปีล่าสุด'
      }
    ]
  },
  '/risk/goals': {
    title: 'เป้าประสงค์',
    summary: 'จัดการเป้าประสงค์ภายใต้วัตถุประสงค์เชิงกลยุทธ์ (SO) ของแต่ละหน่วยงาน ดึงจากระบบ PMS หรือเพิ่มเอง',
    steps: [
      {
        target: '[data-tour="goal-filter"]',
        title: 'เลือกปี หน่วยงาน และ SO',
        body: 'เลือก SO เพื่อดูเฉพาะเป้าประสงค์ภายใต้ SO นั้น หรือเว้นว่างเพื่อดูทั้งหมด'
      },
      {
        target: '[data-tour="goal-actions"]',
        title: 'เพิ่มเป้าประสงค์',
        body: 'ต้องมี SO ของปีและหน่วยงานนั้นก่อน จากนั้นดึงจาก PMS เพิ่มเอง หรือนำเข้าจากปีล่าสุด'
      }
    ]
  },
  '/risk/erm1': {
    title: 'ERM1 — วิเคราะห์สภาพแวดล้อมองค์กร',
    summary:
      'บันทึกบริบทของหน่วยงาน (Organization Context) ต่อกระบวนการดำเนินงาน(หลัก) ภายใต้ SO และเป้าประสงค์: PESTEL, McKinsey 7S, Situation Analysis และ Key Risks + SOFC แล้วออกรายงานเป็น Word',
    steps: [
      {
        target: '[data-tour="erm1-filter"]',
        title: 'เลือกปีและหน่วยงาน',
        body: 'ตารางด้านล่างแสดง SO และเป้าประสงค์ของปีงบประมาณและคณะ/หน่วยงานที่เลือก (เพิ่ม SO/เป้าประสงค์ได้ที่เมนูของตัวเอง)'
      },
      {
        target: '[data-tour="erm1-tree"]',
        title: 'ขยาย SO › เป้าประสงค์ แล้วเพิ่มกระบวนการ',
        body: 'กด + หน้ารหัสเพื่อขยาย กด "+ กระบวนการดำเนินงาน(หลัก)" เพื่อเพิ่ม แล้วกด "บันทึก" ในแถวกระบวนการเพื่อกรอก 4 ขั้น ปุ่ม "รายงาน" และ "Export Word" ใช้ดูและส่งออกผล'
      }
    ]
  },
  '/risk/erm2-3': {
    title: 'ERM2 - 3 — ประเมินความเสี่ยง',
    summary:
      'ต่อจาก ERM1: Key Risks แต่ละข้อเป็น "ความเสี่ยงที่ N" บันทึกปัจจัยเสี่ยง การควบคุมที่มีอยู่ ระดับความเสี่ยง ณ เริ่มต้น (โอกาส × ผลกระทบ) และความเสี่ยงที่เหลืออยู่ แล้วออกรายงาน ERM2 เป็น Word',
    steps: [
      {
        target: '[data-tour="erm2-filter"]',
        title: 'เลือกปีและหน่วยงาน',
        body: 'รายการด้านล่างแสดงเฉพาะกระบวนการที่มี Key Risks ใน ERM1 ของปีและคณะ/หน่วยงานที่เลือก'
      },
      {
        target: '[data-tour="erm2-tree"]',
        title: 'บันทึก ERM2 ต่อความเสี่ยง',
        body: 'กด "บันทึก ERM2" เพื่อกรอก 4 ขั้น ขั้นที่ 2–4 มีแท็บแยกตามปัจจัยเสี่ยง ช่องสีหน้าปัจจัยเสี่ยงคือคะแนน L × I ปุ่ม "รายงาน ERM2" และ "Export Word" ใช้ดูและส่งออกผล แล้วกด "บันทึก ERM3" ในแถวปัจจัยเสี่ยงเพื่อกรอกแผนบริหารจัดการความเสี่ยง 6 ขั้น (มาตรการ, KPI, Leading KRIs, ระดับที่คาดหวัง, ระยะเวลา, ผู้รับผิดชอบ)'
      }
    ]
  },
  '/risk/erm4': {
    title: 'ERM4 — รายงานผลการดำเนินงาน',
    summary:
      'ต่อจาก ERM3: รายงานผลตามแผนของแต่ละปัจจัยเสี่ยง รอบ 6 / 9 / 12 เดือน ได้แก่ ผลมาตรการ (ร้อยละ, สถานะ) ผล KPI และ KRIs เทียบเป้าหมาย ระดับความเสี่ยง ณ รอบ และเอกสารแนบ แล้วส่งออกเป็น Word',
    steps: [
      {
        target: '[data-tour="erm4-filter"]',
        title: 'เลือกปีและหน่วยงาน',
        body: 'รายการด้านล่างแสดงความเสี่ยงและปัจจัยเสี่ยงของปีและคณะ/หน่วยงานที่เลือก'
      },
      {
        target: '[data-tour="erm4-tree"]',
        title: 'บันทึก ERM4 ต่อปัจจัยเสี่ยง',
        body: 'ป้าย 6 ด. / 9 ด. / 12 ด. บอกสถานะแต่ละรอบ (เทา = ยังไม่รายงาน, ส้ม = ยังไม่ครบ, เขียว = ครบ) กด "บันทึก ERM4" เลือกรอบ แล้วกรอกทีละแท็บ กด "บันทึก" ครั้งเดียวเก็บทุกแท็บของรอบนั้น ปุ่มจะใช้ได้เมื่อปัจจัยเสี่ยงมีแผน ERM3 แล้ว'
      }
    ]
  },
  '/admin/audit': {
    title: 'บันทึกการใช้งาน',
    summary: 'ดูว่าใครแก้ไขข้อมูลหรืออัปโหลดไฟล์อะไร เมื่อไร และเปลี่ยนจากค่าใดเป็นค่าใด',
    steps: [
      {
        target: '[data-tour="audit-filter"]',
        title: 'กรองรายการ',
        body: 'เลือกเดือน แล้วพิมพ์รหัสผู้ใช้หรือชื่อการกระทำ เช่น file.upload แล้วกดค้นหา'
      },
      {
        target: '[data-tour="audit-table"]',
        title: 'รายการล่าสุดอยู่บนสุด',
        body: 'แต่ละแถวแสดงผู้กระทำ การกระทำ รายการที่ถูกแก้ และค่าที่เปลี่ยน ค่าที่เป็นความลับถูกซ่อนไว้เสมอ'
      }
    ]
  },
  '/connections': {
    title: 'การเชื่อมต่อของฉัน',
    summary: 'ดูและยกเลิกสิทธิ์ของ chatbot หรือแอปที่ทำงานแทนคุณ',
    steps: [
      {
        target: '[data-tour="connections"]',
        title: 'รายการการเชื่อมต่อ',
        body: 'แต่ละรายการคือ chatbot ที่คุณอนุญาตไว้ พร้อมสิทธิ์และเวลาที่ใช้ล่าสุด'
      },
      {
        target: '[data-tour="connections"]',
        title: 'ยกเลิกการเชื่อมต่อ',
        body: 'กดยกเลิกเพื่อหยุดสิทธิ์ของ chatbot นั้นทันที ระบบจะถามยืนยันก่อนเสมอ'
      }
    ]
  },
  '/requests': {
    title: 'คำขอ',
    summary: 'ยื่นคำขอ ติดตามสถานะ และอนุมัติคำขอ (ผู้ดูแลเท่านั้นที่อนุมัติได้)',
    steps: [
      {
        target: '[data-tour="requests-create"]',
        title: 'สร้างคำขอ',
        body: 'กดเพื่อกรอกคำขอใหม่ ระบบบันทึกเป็นร่างไว้ก่อน และจำข้อมูลที่กรอกค้างไว้ให้แม้ปิดหน้าต่าง'
      },
      {
        target: '[data-tour="requests-filter"]',
        title: 'ค้นหาและกรอง',
        body: 'พิมพ์คำค้นหรือเลือกสถานะและประเภท ตัวกรองอื่นอยู่ใต้ปุ่มตัวกรองเพิ่มเติม'
      },
      {
        target: '[data-tour="requests-table"]',
        title: 'รายการคำขอ',
        body: 'กดที่แถวเพื่อดูขั้นตอน ส่งคำขอ หรืออนุมัติ กดหัวคอลัมน์เพื่อเรียงลำดับ'
      },
      {
        target: '[data-tour="requests-export"]',
        title: 'ส่งออกและพิมพ์',
        body: 'ส่งออกรายการที่กรองอยู่เป็นไฟล์ Excel หรือพิมพ์เป็นรายงาน เลือกบันทึกเป็น PDF ได้จากหน้าต่างพิมพ์'
      }
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
