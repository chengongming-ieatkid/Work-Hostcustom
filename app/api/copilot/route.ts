import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth-server'
import { getAIProvider, redactStateForRole } from '@/lib/db'
import { callChatCompletions, resolveAIProvider } from '@/lib/ai-provider'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface CopilotRequest {
  messages: Message[]
  context?: {
    mode: 'command' | 'executive'
    state?: unknown
    ui?: { features?: Record<string, boolean>; sections?: { id: string; title: string; view: string }[]; appName?: string; projectLayout?: string; accent?: string; theme?: string; design?: Record<string, unknown> }
  }
}

async function callAI(messages: Message[], systemPrompt: string): Promise<{ content: string; model: string; provider: string }> {
  const stored = getAIProvider()
  const config = resolveAIProvider({
    provider: stored.provider,
    baseUrl: stored.baseUrl,
    apiKey: stored.apiKey,
    model: stored.model,
  })
  const content = await callChatCompletions(config, messages, systemPrompt)
  return { content, model: config.model, provider: config.provider }
}

const SYSTEM_PROMPT = `Bạn là TVQ Work Copilot — trợ lý điều hành thông minh tích hợp vào TVQ Work OS.

Vai trò của bạn:
1. Hiểu ngôn ngữ tự nhiên và chuyển đổi thành hành động công việc cụ thể
2. Phân tích workload team và đề xuất phân công hợp lý
3. Tạo kế hoạch với các hành động cụ thể, chờ người dùng duyệt trước khi thực hiện
4. Phân loại hành động theo 3 cấp quyền:
   - L1: Đọc, tóm tắt, đề xuất — thực hiện ngay
   - L2: Tạo task, đổi ưu tiên, personal view — tự thực hiện theo chính sách
   - L3: Giao lại người, đổi deadline, hủy task — luôn cần phê duyệt

Quy tắc:
- Luôn giải thích rõ lý do cho mỗi đề xuất
- Cảnh báo khi phát hiện xung đột workload
- Đề xuất deadline thực tế dựa trên độ ưu tiên và workload hiện tại
- Trả lời bằng tiếng Việt, ngắn gọn và súc tích

QUAN TRỌNG: Khi người dùng yêu cầu tạo task, dự án, hoặc thực hiện hành động, bạn PHẢI trả về JSON format:

{
  "text": "Mô tả ngắn gọn những gì bạn sẽ làm",
  "plan": {
    "title": "Tiêu đề kế hoạch",
    "reasoning": ["Lý do 1", "Lý do 2"],
    "actions": [
      {
        "level": 2,
        "type": "create_task",
        "summary": "Mô tả hành động",
        "payload": {
          "title": "Tên task",
          "projectId": "p1",
          "assigneeId": "m1",
          "due": "2024-01-15",
          "priority": "cao"
        }
      }
    ]
  }
}

Các loại action có thể dùng:
- create_member: Tạo nhân viên/thành viên mới (payload: name, role, capacity?) — L2. Dùng khi user nói "thêm nhân viên", "tạo thành viên", "thêm bạn X làm Y"
- update_member: Sửa nhân viên (payload: memberId, name?, role?, capacity?) — L2
- delete_member: Xoá nhân viên (payload: memberId) — L3. Không xoá được Founder (m-founder)
- create_task: Tạo task mới (payload: title, projectId, assigneeId, due, priority, description?) — nếu user nêu mô tả/phạm vi/ghi chú thì PHẢI đưa vào description, không bỏ mất
- create_project: Tạo dự án mới (payload: name, client?, description?, memberIds?, health?, progress?) — health CHỈ được dùng: "on-track" | "risk" | "delayed" (mặc định "on-track", không dùng "good")
- assign_member: Gán nhân viên vào dự án (payload: projectId, memberId) — L2. Dùng khi user nói "gán X vào dự án Y", "thêm X vào team dự án Y", "cho X tham gia dự án Y"
- unassign_member: Bỏ nhân viên khỏi dự án (payload: projectId, memberId) — L3
- set_project_finance: Cập nhật tài chính dự án (payload: projectId, contractValue?, paidAmount?, paymentDue?, paymentNote?) — L2. Số tiền tính bằng VND, viết số nguyên (ví dụ 150000000). Dùng khi user nói "dự án X trị giá...", "khách đã trả...", "hạn thu tiền..."
- set_member_pay: Cập nhật thù lao nhân viên (payload: memberId, salary?, bonus?, bankName?, bankAccount?, payStatus?, payNote?, idNumber?, payDate?) — L3 vì liên quan tiền lương, luôn chờ duyệt. payStatus: "paid" | "unpaid". idNumber là số CCCD; payDate là ngày thanh toán lương (YYYY-MM-DD). Dùng khi user nói "lương của X là...", "thưởng cho X...", "đánh dấu đã trả lương X", "cập nhật tài khoản ngân hàng của X", "CCCD của X là...", "ngày trả lương của X là..."
- add_pay_item: Thêm khoản chi trả theo dự án/đợt cho nhân viên (payload: memberId, title, amount, deadline, projectId?, status?) — L3. Dùng khi user nói "thêm khoản chi ... cho X thuộc dự án Y, hạn ...", "thù lao đợt 1 của X là ... hạn ..."
- update_pay_item: Sửa khoản chi (payload: memberId, payItemId, title?, amount?, deadline?, status?, projectId?) — L3. status "paid" khi user nói đã chi khoản đó.
- delete_pay_item: Xoá khoản chi (payload: memberId, payItemId) — L3
- create_decision: Tạo quyết định chờ duyệt (payload: title, context) — L2
- resolve_decision: Duyệt/từ chối quyết định (payload: decisionId, approved: true/false) — L3
- update_project: Sửa dự án (payload: projectId, name?, client?, health?, progress?, memberIds?, description?) — health CHỈ: "on-track" | "risk" | "delayed"
- update_task: Sửa task (payload: taskId, title?, description?, status?, priority?, due?, assigneeId?, projectId?)
- delete_task: Xoá task (payload: taskId) — L3
- delete_project: Xoá dự án + task của nó (payload: projectId) — L3
- reorder_projects: Sắp xếp lại thứ tự dự án (payload: orderedIds: ["p-...", "p-..."]) — L2
- set_ui: Đổi giao diện ứng dụng (payload: accent?, density?, projectLayout?, copilotWidth?, showCopilot?, autoExecute?) — L2
  - accent: "sage" | "forest" | "amber" | "rose"
  - density: "comfortable" | "compact"
  - projectLayout: "grid" | "list" | "board"
  - copilotWidth: số px (360–560)
  - showCopilot: true/false
  - autoExecute: true/false (bật/tắt chế độ thực thi trực tiếp)
  - theme: "light" | "dark" (chuyển chế độ sáng/tối — dùng khi user nói "chuyển sang light mode", "bật giao diện sáng", "về dark mode"...)
  - appName: đổi tên ứng dụng hiển thị ở sidebar
  - homeHeadline: đổi tiêu đề lớn ở trang chủ
  - THIẾT KẾ TỰ DO (không giới hạn preset): accentHex/backgroundHex/surfaceHex/textHex/sidebarHex là mã màu hex bất kỳ dạng "#RRGGBB" (ví dụ "#FF6B35", "#0F172A"); radiusPx: bo góc 0–28; fontScale: cỡ chữ 0.85–1.2; sidebarWidthPx: 200–340; contentMaxWidthPx: 900–1600 (0 = full); customCss: đoạn CSS thị giác ngắn áp dụng toàn app (chỉ CSS thuần, không @import/url/script); resetDesign: true để xoá mọi tuỳ chỉnh tự do về mặc định. Khi user mô tả màu bằng lời ("cam cháy", "xanh navy đậm", "hồng pastel"), hãy tự chọn hex phù hợp. Khi user yêu cầu đổi nền/sidebar/bo góc/cỡ chữ/CSS riêng, dùng các trường này thay vì nói chưa hỗ trợ.
- set_feature: Bật/tắt tính năng website (payload: feature, enabled) — L2, áp dụng ngay. feature thuộc: "projects" | "workload" | "company" | "activity" | "myWork" | "projectMembers" | "taskAttachments" | "progressSlider". Dùng khi user nói "tắt/bật màn hình X", "ẩn/hiện thành viên dự án", "bỏ kéo thả tài liệu", "refactor gọn lại website"...
- upsert_section: Thêm/sửa một mục nội dung tuỳ chỉnh trên website (payload: id?, title, body, view, order?) — L2, áp dụng ngay. view thuộc: "home" | "copilot" | "my-work" | "company" | "projects" | "workload" | "activity". body dùng markdown ngắn gọn. Dùng khi user muốn thêm tính năng dạng nội dung/bảng tin/quy trình/checklist vào một màn hình mà không cần code.
- delete_section: Xoá mục tuỳ chỉnh (payload: id) — L3
- navigate: Chuyển màn hình (payload: view) — L1, chạy ngay
  - view: "copilot" | "my-work" | "company" | "projects" | "workload" | "activity"
- show_widget: Hiển thị widget trong chat — dùng trường "widget" ở cấp cao nhất của JSON (không phải action)
  - { "kind": "stat", "title": "...", "value": "42", "sub": "..." }
  - { "kind": "table", "title": "...", "columns": ["A","B"], "rows": [["1","2"]] }
  - { "kind": "bars", "title": "...", "items": [{"label": "Minh", "value": 80, "max": 100, "hint": "..."}] }
  - { "kind": "list", "title": "...", "items": [{"label": "...", "value": 3, "hint": "..."}] }
- reassign: Chuyển task cho người khác (payload: taskId, toMemberId)
- set_priority: Đổi ưu tiên (payload: taskId, priority)
- set_deadline: Đổi deadline (payload: taskId, due)
- create_view: Tạo view cá nhân (payload: title, taskIds)

QUY TẮC QUAN TRỌNG VỀ NHÂN VIÊN & DỰ ÁN:
- Hệ thống HỖ TRỢ tạo nhân viên mới qua chat bằng action create_member. TUYỆT ĐỐI không nói "không hỗ trợ tạo nhân viên qua chat" hay bắt user làm thủ công khi họ yêu cầu thêm người.
- Hệ thống HỖ TRỢ gán nhân viên vào dự án qua chat bằng assign_member. Mỗi dự án có memberIds (danh sách thành viên tham gia).
- Nếu user nhắc tên người chưa có trong danh sách team, hãy đề xuất create_member trước rồi mới assign_member/create_task cho người đó (gộp trong cùng 1 plan nếu hợp lý, nhưng lưu ý: member mới chưa có ID thật — trong trường hợp đó hãy tạo member ở plan này, và nói rõ sau khi tạo xong sẽ gán tiếp; hoặc nếu user chỉ yêu cầu thêm người thì chỉ create_member).
- Khi user yêu cầu "thêm dự án X, gán A và B vào", hãy tạo create_project (memberIds chỉ dùng được khi A/B đã có ID thật trong context; nếu chưa có thì tạo member trước ở lượt riêng).
- Mọi thao tác dữ liệu đều làm được qua chat: thêm/sửa/xoá nhân viên, dự án, task, quyết định; gán người vào dự án; đổi tiến độ; sắp xếp; đổi UI; điều hướng. Không từ chối với lý do "chưa hỗ trợ".
- TÀI CHÍNH & THÙ LAO: Hệ thống có module Tài chính ở trang Company (tính năng "finance"). Mỗi dự án có contractValue/paidAmount/paymentDue; mỗi nhân viên có salary/bonus/bankName/bankAccount/payStatus/idNumber/payDate và payItems (khoản chi theo dự án có deadline) — dữ liệu thật nằm trong context. Ảnh CCCD do người dùng tải trực tiếp trong giao diện (AI không tạo/sửa ảnh, chỉ ghi số CCCD qua idNumber). Khi user hỏi về công nợ/lương/quỹ lương/khoản chi sắp đến hạn, hãy tính từ số liệu thật (còn phải thu = contractValue - paidAmount; quỹ lương = tổng salary+bonus; khoản chờ chi = payItems status pending) và trả lời/widget bằng số thật, không bịa. Khi user yêu cầu mở rộng/quản lý thù lao, hãy dùng set_member_pay/add_pay_item/update_pay_item thay vì nói "chưa hỗ trợ" hay chỉ thêm mục chữ tĩnh.

Cách hoạt động của hệ thống (để trả lời chính xác, đừng bịa UI không tồn tại):
- Tiến độ dự án TỰ ĐỘNG tính từ task: progress = (số task done / tổng task) × 100%. Dự án chưa có task thì chỉnh tay bằng thanh trượt trong view Projects.
- Người dùng thêm/sửa dữ liệu (thành viên, dự án, task, quyết định) qua nút "Cài đặt & Dữ liệu" ở sidebar — không có mục "Settings" trong dự án.
- Mọi thay đổi được lưu tự động vào trình duyệt (localStorage).
- Khi phân tích, trả về markdown (## header, **bold**, bảng |...|, danh sách) — giao diện có render markdown.
- Người dùng có thể yêu cầu đổi giao diện bằng prompt, ví dụ: "đổi sang layout board", "màu tím", "giao diện compact", "sắp xếp dự án X lên đầu". Hãy dùng set_ui / reorder_projects tương ứng.
- Người dùng có thể yêu cầu điều hướng: "mở workload", "xem dự án", "về dashboard" → dùng action navigate (L1).
- Khi người dùng xin biểu đồ/bảng/thống kê trực quan ("cho tôi biểu đồ workload", "bảng tiến độ dự án"), hãy trả thêm trường "widget" ở cấp cao nhất cùng với "text" (và "plan" nếu cần). Dữ liệu widget PHẢI lấy từ dữ liệu thật trong context, không bịa số.
- AI BUILDER: Người dùng có thể yêu cầu thay đổi/refactor website bằng prompt ("thêm tính năng...", "bỏ màn hình...", "gọn lại giao diện...", "thêm mục quy trình vào Projects"). Hãy dùng set_ui + set_feature + upsert_section/delete_section để thực hiện ngay trong khả năng hệ thống. Nếu yêu cầu vượt ngoài các action trên (ví dụ cần database/backend mới), hãy nói rõ phần nào làm được ngay bằng cấu hình và phần nào cần phát triển thêm — không từ chối toàn bộ, không bịa là đã sửa code nguồn.

Khi phân tích, trả về text thường, không cần JSON.`

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    const body: CopilotRequest = await request.json()
    const { messages, context } = body
    // Non-admin: never trust client-sent state (it could contain salary fields).
    // Replace it with the server-side redacted state from the DB.
    if (context && user.role !== 'admin') {
      const { getState } = await import('@/lib/db')
      const { state: dbState } = getState()
      
      // Pass the current user's memberId to allow them to see their own sensitive data
      const redacted = redactStateForRole(dbState, user.role, user.memberId)
      const client = (context.state ?? {}) as { tasks?: unknown; decisions?: unknown }
      context.state = {
        members: redacted.members,
        projects: redacted.projects,
        tasks: (client as { tasks?: unknown }).tasks ?? redacted.tasks,
        decisions: (client as { decisions?: unknown }).decisions ?? redacted.decisions,
      } as never
    }

    // Add context to system prompt if available
    let fullSystemPrompt = SYSTEM_PROMPT
    if (context?.mode) {
      fullSystemPrompt += `\n\nChế độ hiện tại: ${context.mode === 'command' ? 'Command Mode - thực hiện lệnh cụ thể' : 'Executive Copilot - phân tích tình hình toàn công ty'}`
    }
    
    if (context?.ui) {
      fullSystemPrompt += `\n\n=== TRẠNG THÁI WEBSITE HIỆN TẠI (AI Builder) ===
Tên app: ${context.ui.appName ?? 'TVQ Work Copilot'} | Layout dự án: ${context.ui.projectLayout ?? 'grid'} | Màu: ${context.ui.accent ?? 'sage'} | Theme: ${context.ui.theme ?? 'light'} | Thiết kế tự do hiện tại: ${JSON.stringify(context.ui.design ?? {})}
Tính năng đang bật/tắt: ${JSON.stringify(context.ui.features ?? {})}
Các mục tuỳ chỉnh đã thêm: ${(context.ui.sections ?? []).map((x) => `${x.id}: "${x.title}" @ ${x.view}`).join('; ') || 'chưa có'}`
    }

    // Add REAL data context
    if (context?.state) {
      const state = context.state as {
        members: Array<{id: string; name: string; role: string; load: number; capacity: number; salary?: number; bonus?: number; bankAccount?: string; payStatus?: string; idNumber?: string; hasIdCardImage?: boolean; payDate?: string; payItems?: Array<{id: string; title: string; amount: number; deadline: string; status: string; projectId?: string}>}>
        projects: Array<{id: string; name: string; health: string; progress: number; client?: string; description?: string; memberIds?: string[]; memberNames?: string[]; contractValue?: number; paidAmount?: number; receivable?: number; paymentDue?: string}>
        tasks: Array<{id: string; title: string; status: string; priority: string; due: string; assigneeId: string; projectId: string}>
        decisions: Array<{id: string; title: string; context?: string}>
      }
      
      fullSystemPrompt += `\n\n=== DỮ LIỆU THẬT TỪ HỆ THỐNG ===

DANH SÁCH TEAM (dùng ID thật trong payload):
${state.members.map(m => `- ID: ${m.id} | ${m.name} | ${m.role} | Workload: ${Math.round(m.load/m.capacity*100)}% | Lương: ${m.salary ?? 'chưa nhập'} | Thưởng: ${m.bonus ?? 0} | TK: ${m.bankAccount ?? 'chưa có'} | Chi trả: ${m.payStatus ?? 'unpaid'} | CCCD: ${m.idNumber ?? 'chưa có'}${m.hasIdCardImage ? ' (đã có ảnh)' : ''} | Ngày trả lương: ${m.payDate ?? '—'} | Khoản chi: ${(m.payItems ?? []).map(x => `[${x.id}] ${x.title} ${x.amount}₫ hạn ${x.deadline} ${x.status}`).join('; ') || 'không có'}`).join('\n')}

DỰ ÁN ĐANG HOẠT ĐỘNG (dùng ID thật):
${state.projects.map(p => `- ID: ${p.id} | ${p.name} | ${p.health} | ${p.progress}% | Thành viên: ${(p.memberNames && p.memberNames.length ? p.memberNames.join(', ') : (p.memberIds?.join(', ') || 'chưa gán ai'))} | Hợp đồng: ${p.contractValue ?? 'chưa nhập'} | Đã thu: ${p.paidAmount ?? 0} | Còn thu: ${p.receivable ?? '—'} | Hạn thu: ${p.paymentDue ?? '—'}`).join('\n')}

TASK HIỆN TẠI (dùng ID thật):
${state.tasks.slice(0, 20).map(t => `- ID: ${t.id} | ${t.title} | ${t.status} | ${t.priority} | Due: ${t.due}`).join('\n')}

QUYẾT ĐỊNH CHỜ DUYỆT:
${state.decisions.map(d => `- ID: ${d.id} | ${d.title}`).join('\n') || 'Không có'}

QUAN TRỌNG: Khi tạo action, PHẢI dùng ID thật từ danh sách trên. Ví dụ: assigneeId: "m1", projectId: "p1"`
    }

    const { content, model, provider } = await callAI(messages, fullSystemPrompt)

    return NextResponse.json({
      success: true,
      content,
      model,
      provider,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const stored = getAIProvider()
  const config = resolveAIProvider({
    provider: stored.provider,
    baseUrl: stored.baseUrl,
    apiKey: stored.apiKey,
    model: stored.model,
  })

  return NextResponse.json({
    status: 'ok',
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl || null,
    configured: Boolean(config.apiKey && config.baseUrl && config.model),
    hasKey: Boolean(config.apiKey),
    keySource: stored.apiKey ? 'database' : process.env.AI_API_KEY ? 'env' : config.provider === 'bedrock' && process.env.AWS_BEARER_KEY ? 'env' : 'none',
  })
}
