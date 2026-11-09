import type { WorkState } from './types'

export interface SlashResult {
  handled: boolean
  text?: string
  action?: 'reset' | 'export' | 'import' | 'clear-chat'
}

const HELP = `**Lệnh hệ thống (chạy ngay, không qua AI):**

- \`/help\` — hiện hướng dẫn này
- \`/stats\` — thống kê nhanh hệ thống
- \`/export\` — tải xuống toàn bộ dữ liệu (JSON)
- \`/reset\` — xoá toàn bộ dữ liệu, bắt đầu lại
- \`/clear\` — xoá lịch sử chat

**Prompt điều khiển trực tiếp (ví dụ):**
- "Thêm Lan Phạm làm Frontend" — tạo nhân viên mới
- "Tạo dự án App Tay Vịn, gán Lan và Minh vào dự án" — tạo dự án + gán người
- "Gán Lan vào dự án ERP Core" — gán nhân viên vào dự án
- "Tạo task ..., giao cho ..., hạn ..." — tạo việc
- "Đổi sang màu tím, layout bảng, mở Projects" — sửa giao diện + điều hướng
- "Chuyển sang light mode" / "Về dark mode" — đổi chế độ sáng/tối toàn hệ thống
- "Đổi màu nhấn sang cam cháy #FF6B35, nền navy đậm, bo góc 16px, sidebar 280px" — thiết kế tự do bằng màu hex/kích thước bất kỳ
- "Thêm CSS: tiêu đề chính đậm hơn" — prompt viết CSS tuỳ chỉnh áp dụng toàn app (đặt lại bằng: "xoá thiết kế tự do")
- "Tắt Team Workload, thêm mục Ưu tiên tuần này vào trang chủ" — refactor website bằng prompt (bật/tắt tính năng, thêm mục nội dung)
- "Đổi tên app thành TVQ Ops" — đổi thương hiệu hiển thị
- "Dự án X trị giá 200 triệu, khách đã trả 80 triệu, hạn thu 20/11" — cập nhật công nợ dự án
- "Lương của Lan là 25 triệu, thưởng 5 triệu, Vietcombank 0123..." — cập nhật thù lao (L3, cần duyệt)
- "Công nợ còn bao nhiêu?" — phân tích tài chính bằng số thật ở trang Company
- "CCCD của Lan là 001..., ngày trả lương 05/11, thêm khoản chi đợt 1 dự án X 10 triệu hạn 15/11" — mở rộng thù lao (L3)
- "Đưa dự án X lên đầu" — sắp xếp dự án
- "Cho tôi biểu đồ workload team" — tạo biểu đồ trong chat`

export function handleSlashCommand(raw: string, state: WorkState): SlashResult {
  const cmd = raw.trim().toLowerCase()
  if (!cmd.startsWith('/')) return { handled: false }

  if (cmd === '/help') return { handled: true, text: HELP }

  if (cmd === '/clear') return { handled: true, action: 'clear-chat', text: 'Đã xoá lịch sử chat.' }

  if (cmd === '/reset') return { handled: true, action: 'reset', text: 'Đã xoá toàn bộ dữ liệu. Hệ thống trở về trạng thái trống.' }

  if (cmd === '/export') return { handled: true, action: 'export', text: 'Đang tải xuống dữ liệu...' }

  if (cmd === '/stats') {
    const open = state.tasks.filter((t) => t.status !== 'done').length
    const done = state.tasks.filter((t) => t.status === 'done').length
    const overdue = state.tasks.filter((t) => t.status !== 'done' && new Date(t.due) < new Date()).length
    return {
      handled: true,
      text: `**Thống kê hệ thống:** ${state.projects.length} dự án · ${state.members.length} thành viên · ${open} task đang mở · ${done} đã xong · ${overdue} quá hạn · ${state.decisions.filter((d) => d.status === 'pending').length} quyết định chờ duyệt.`,
    }
  }

  return { handled: true, text: `Không rõ lệnh \`${cmd}\`. Gõ \`/help\` để xem danh sách lệnh.` }
}

export function downloadState(state: WorkState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tvq-workos-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
