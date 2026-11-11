// Shared (client + server) types and rules for the /requests approval demo.

export type RequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export const statusLabel: Record<RequestStatus, string> = {
  draft: 'ร่าง',
  submitted: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
}

export const statusColor: Record<RequestStatus, 'default' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error'
}

export const categories = [
  { value: 'equipment', label: 'ครุภัณฑ์' },
  { value: 'supplies', label: 'วัสดุสิ้นเปลือง' },
  { value: 'travel', label: 'เดินทางไปราชการ' },
  { value: 'other', label: 'อื่น ๆ' }
]

export const categoryLabel = (v: string) => categories.find(c => c.value === v)?.label ?? v

export type RequestInput = {
  title: string
  category: string
  amount: number
  neededBy: string
  detail: string
}

export type HistoryEntry = { status: RequestStatus; by: string; at: string; note?: string }

export type RequestRecord = RequestInput & {
  id: string
  status: RequestStatus
  requesterId: string
  requesterName: string
  createdAt: string
  updatedAt: string
  history: HistoryEntry[]
}

/** Workflow actions: who may move a request from which status to which. */
export type RequestAction = 'submit' | 'approve' | 'reject'

export const transitions: Record<RequestAction, { from: RequestStatus; to: RequestStatus; adminOnly: boolean }> = {
  submit: { from: 'draft', to: 'submitted', adminOnly: false },
  approve: { from: 'submitted', to: 'approved', adminOnly: true },
  reject: { from: 'submitted', to: 'rejected', adminOnly: true }
}
