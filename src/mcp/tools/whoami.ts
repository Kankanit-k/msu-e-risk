import { defineTool } from '../types'

export default defineTool({
  name: 'whoami',
  title: 'ข้อมูลผู้ใช้ปัจจุบัน',
  description: 'คืนชื่อ อีเมล และระดับสิทธิ์ของผู้ใช้ที่กำลังคุยอยู่ ใช้เมื่อผู้ใช้ถามว่าตนเป็นใครหรือมีสิทธิ์อะไร',
  input: {},
  minRole: 'user',
  kind: 'read',
  handler: async caller => ({ name: caller.name, email: caller.email, role: caller.role, via: caller.clientId })
})
