import { FOUNDER_ID } from './seed'
import type { Analysis, CopilotReply, Member, Plan, PlanAction, Task, WorkState } from './types'

const DAY = 86_400_000

function iso(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function nextFriday(): string {
  const d = new Date()
  const diff = (5 - d.getDay() + 7) % 7 || 7
  return iso(diff)
}

export function fmtDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${d}/${m}`
}

export function isOverdue(task: Task): boolean {
  return task.status !== 'done' && new Date(task.due).getTime() < Date.now() - DAY / 2
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function act(level: 1 | 2 | 3, type: PlanAction['type'], summary: string, detail?: string, payload?: Record<string, unknown>): PlanAction {
  return { id: uid('act'), level, type, summary, detail, payload }
}

function makePlan(mode: Plan['mode'], title: string, reasoning: string[], actions: PlanAction[], impact: string[]): Plan {
  return { id: uid('plan'), mode, title, reasoning, actions, impact, status: 'pending' }
}

function loadRatio(m: Member): number {
  return m.load / m.capacity
}

/* ------------------------------------------------------------------ */
/* Intent routing                                                      */
/* ------------------------------------------------------------------ */

export function interpret(rawPrompt: string, state: WorkState, mode: 'command' | 'executive'): CopilotReply {
  const prompt = rawPrompt.toLowerCase()

  const wantsExecutive =
    mode === 'executive' ||
    /phân tích|tình hình|xác định.*(việc|trách nhiệm).*tôi|tổng quan|toàn công ty|nên xử lý/.test(prompt)

  if (wantsExecutive) return executive(state)
  if (/chuyển|giao lại|đổi người|phù hợp hơn/.test(prompt)) return reassign(state)
  if (/ưu tiên|sắp xếp lại/.test(prompt)) return prioritize(state)
  if (/việc cần xử lý|hôm nay|danh sách việc/.test(prompt)) return myDay(state)
  if (/tạo|giao|chia việc|lên kế hoạch|làm|review|hạn/.test(prompt)) return command(prompt, state)
  return fallback(state)
}

/* ------------------------------------------------------------------ */
/* Mode 1 — Command Mode                                               */
/* ------------------------------------------------------------------ */

function detectProject(prompt: string, state: WorkState) {
  if (/khách hàng a|khách a|phần mềm/.test(prompt)) return state.projects.find((p) => p.id === 'p1')
  if (/nội bộ|nền tảng/.test(prompt)) return state.projects.find((p) => p.id === 'p2')
  if (/website|thương mại|khách hàng b/.test(prompt)) return state.projects.find((p) => p.id === 'p3')
  return undefined
}

function detectMembers(prompt: string, state: WorkState): Member[] {
  return state.members.filter((m) => {
    const first = m.name.split(' ')[0].toLowerCase()
    return first !== 'bạn' && prompt.includes(first)
  })
}

function command(prompt: string, state: WorkState): CopilotReply {
  const project = detectProject(prompt, state) ?? state.projects[0]
  const mentioned = detectMembers(prompt, state)

  if (!project || state.members.filter((m) => m.id !== FOUNDER_ID).length === 0) {
    return {
      text:
        'Chưa có đủ dữ liệu để lập kế hoạch. Hãy mở "Quản lý dữ liệu thật" để thêm dự án và thành viên trước, ' +
        'hoặc yêu cầu tôi tạo dự án mới (ví dụ: "Tạo dự án App Tay Vịn").',
    }
  }
  const deadline = /thứ sáu|friday/.test(prompt) ? nextFriday() : /tuần sau/.test(prompt) ? iso(7) : iso(5)

  const overloaded = state.members.filter((m) => m.id !== FOUNDER_ID && loadRatio(m) >= 0.9)
  const defaultCrew = ['m1', 'm2', 'm4'].map((id) => state.members.find((m) => m.id === id)!)
  const crew = mentioned.length > 0 ? mentioned : defaultCrew

  const pool = [...state.members].filter((m) => m.id !== FOUNDER_ID).sort((a, b) => loadRatio(a) - loadRatio(b))
  const pick = (preferred: Member | undefined, used: Set<string>): Member => {
    if (preferred && !used.has(preferred.id)) return preferred
    return pool.find((m) => !used.has(m.id)) ?? preferred ?? pool[0]
  }
  const a1 = pick(crew[0], new Set())
  const a2 = pick(crew[1], new Set([a1.id]))
  const a3 = pick(crew[2], new Set([a1.id, a2.id]))

  const blueprints = [
    { title: `Backend — ${project.name}`, assignee: a1 },
    { title: `Review kiến trúc — ${project.name}`, assignee: a2 },
    { title: `Kiểm thử staging — ${project.name}`, assignee: a3 },
  ]

  const actions: PlanAction[] = blueprints.map((b) => {
    const isRisky = loadRatio(b.assignee) >= 0.9
    return act(
      isRisky ? 3 : 2,
      'create_task',
      `Tạo task "${b.title}" → ${b.assignee.name}`,
      isRisky
        ? `${b.assignee.name} đang ở ${b.assignee.load}/${b.assignee.capacity} điểm công việc (quá tải). Cần bạn xác nhận trước khi giao thêm.`
        : `Hạn ${fmtDate(deadline)} · ưu tiên cao · thuộc ${project.name}`,
      { title: b.title, projectId: project.id, assigneeId: b.assignee.id, due: deadline, priority: 'cao' },
    )
  })

  const riskyNames = overloaded.map((m) => m.name).join(', ')
  const reasoning = [
    `Xác định dự án: ${project.name}${project.client ? ` (${project.client})` : ''}.`,
    `Đọc workload hiện tại của ${crew.map((c) => c.name).join(', ')}.`,
    overloaded.length > 0
      ? `Phát hiện quá tải: ${riskyNames}. Các phân công liên quan được nâng lên L3 và chờ bạn duyệt.`
      : `Không phát hiện xung đột nguồn lực.`,
    `Đề xuất hạn chung: ${fmtDate(deadline)}.`,
  ]

  return {
    text:
      `Đã lập kế hoạch chia việc cho ${project.name}. ` +
      (overloaded.length > 0
        ? `Lưu ý: ${riskyNames} đang quá tải — tôi dừng các phân công đó ở bước xác nhận.`
        : `Xem trước bên dưới và duyệt để tôi thực hiện.`),
    plan: makePlan(
      'command',
      `Chia việc — ${project.name}`,
      reasoning,
      actions,
      [
        `${actions.length} task mới sẽ xuất hiện trong ${project.name} và Team Workload.`,
        `Deadline chính thức của các task mới: ${fmtDate(deadline)}.`,
      ],
    ),
  }
}

function reassign(state: WorkState): CopilotReply {
  const candidates = state.members.filter((m) => m.id !== FOUNDER_ID)
  if (candidates.length < 2) return fallback(state)
  const busiest = [...candidates].sort((a, b) => loadRatio(b) - loadRatio(a))[0]
  const freest = [...candidates].sort((a, b) => loadRatio(a) - loadRatio(b))[0]
  const task = state.tasks
    .filter((t) => t.assigneeId === busiest.id && t.status !== 'done')
    .sort((a, b) => (a.priority === 'cao' ? 1 : -1))[0]

  if (!task) return fallback(state)

  const plan = makePlan(
    'command',
    `Chuyển việc cho người phù hợp hơn`,
    [
      `${busiest.name} đang ở ${busiest.load}/${busiest.capacity} điểm — tỷ lệ cao nhất team.`,
      `Task nhẹ nhất của ${busiest.name.split(' ')[0]}: "${task.title}".`,
      `${freest.name} còn dư ${freest.capacity - freest.load} điểm và cùng khả năng tiếp nhận.`,
      `Kiểm tra phụ thuộc: không task nào chờ "${task.title}" làm điều kiện bắt đầu.`,
    ],
    [
      act(3, 'reassign', `Chuyển "${task.title}" từ ${busiest.name} → ${freest.name}`, undefined, {
        taskId: task.id,
        toMemberId: freest.id,
      }),
    ],
    [
      `Workload ${busiest.name.split(' ')[0]} giảm ${1.5} điểm, ${freest.name.split(' ')[0]} tăng ${1.5} điểm.`,
      `Người phụ trách task thay đổi — sẽ hiện trên giao diện của cả hai.`,
    ],
  )

  return {
    text: `Tôi đề xuất chuyển "${task.title}" sang ${freest.name}. Đây là thay đổi ảnh hưởng người khác (L3) — cần bạn duyệt.`,
    plan,
  }
}

function prioritize(state: WorkState): CopilotReply {
  // Ưu tiên dự án rủi ro/trễ nhất mặc định
  const riskiest = [...state.projects].sort((a, b) => (a.health === 'delayed' ? -1 : b.health === 'delayed' ? 1 : a.health === 'risk' ? -1 : 1))[0]
  const tasks = state.tasks.filter((t) => t.projectId === riskiest.id && t.priority !== 'cao' && t.status !== 'done')

  const actions: PlanAction[] = tasks.map((t) =>
    act(2, 'set_priority', `Nâng ưu tiên "${t.title}" → cao`, undefined, { taskId: t.id, priority: 'cao' }),
  )

  return {
    text: `Sắp xếp lại thứ tự ưu tiên quanh ${riskiest.name} — dự án đang ${riskiest.health === 'delayed' ? 'trễ' : 'rủi ro'}. Các thay đổi L2 sẽ tự áp dụng sau khi bạn duyệt cả kế hoạch.`,
    plan: makePlan(
      'command',
      `Sắp xếp lại ưu tiên — ${riskiest.name}`,
      [
        `${riskiest.name} đang ở trạng thái ${riskiest.health === 'delayed' ? 'trễ deadline' : 'rủi ro'} (${riskiest.progress}% tiến độ).`,
        `Nâng ${tasks.length} task lên ưu tiên cao để dồn nguồn lực.`,
        `Không đổi người phụ trách hay deadline — chỉ thứ tự ưu tiên chung.`,
      ],
      actions,
      [`Thứ tự ưu tiên chung của ${riskiest.name} thay đổi trên Company Dashboard.`],
    ),
  }
}

function myDay(state: WorkState): CopilotReply {
  const today = state.tasks
    .filter((t) => t.assigneeId === FOUNDER_ID && t.status !== 'done')
    .filter((t) => isOverdue(t) || new Date(t.due).getTime() < Date.now() + 2 * DAY)

  const plan = makePlan(
    'command',
    'Tạo danh sách việc cần xử lý hôm nay',
    [
      'Đây là personal view — không tạo task mới, không đổi ưu tiên chung.',
      `Gom ${today.length} việc của bạn (quá hạn hoặc đến hạn trong 48h).`,
    ],
    [act(2, 'create_view', `Tạo personal view "Việc cần xử lý hôm nay"`, undefined, {
      title: 'Việc cần xử lý hôm nay',
      taskIds: today.map((t) => t.id),
    })],
    ['Chỉ thay đổi giao diện cá nhân của bạn. Company Dashboard không thay đổi.'],
  )

  return {
    text: `Tôi gom được ${today.length} việc thuộc phạm vi của bạn. Danh sách này chỉ là view cá nhân (L2) — dữ liệu công việc vẫn tồn tại một lần duy nhất.`,
    plan,
  }
}

function fallback(state: WorkState): CopilotReply {
  const overdue = state.tasks.filter(isOverdue).length
  const pending = state.decisions.filter((d) => d.status === 'pending').length
  return {
    text:
      'Tôi có thể: tạo và chia task theo prompt ("chia việc cho team IT..."), chuyển việc cho người phù hợp hơn, sắp xếp lại ưu tiên, tạo danh sách việc hôm nay, hoặc chuyển sang Executive Copilot để phân tích tình hình toàn công ty. ' +
      `Hiện tại: ${overdue} task trễ, ${pending} quyết định đang chờ bạn.`,
  }
}

/* ------------------------------------------------------------------ */
/* Mode 2 — Executive Copilot                                          */
/* ------------------------------------------------------------------ */

function executive(state: WorkState): CopilotReply {
  const overdue = state.tasks.filter(isOverdue)
  const blocked = state.tasks.filter((t) => t.blocked && t.status !== 'done')
  const pendingDecisions = state.decisions.filter((d) => d.status === 'pending')
  const overloaded = state.members.filter((m) => loadRatio(m) >= 0.9)

  const myTasks = state.tasks.filter((t) => t.assigneeId === FOUNDER_ID && t.status !== 'done')
  const delegable = myTasks
    .filter((t) => t.priority !== 'cao')
    .map((t) => {
      const freest = [...state.members].filter((m) => m.id !== FOUNDER_ID).sort((a, b) => loadRatio(a) - loadRatio(b))[0]
      return { taskTitle: t.title, suggestTo: freest.name, reason: `${freest.name} còn dư ${freest.capacity - freest.load} điểm công việc` }
    })

  const analysis: Analysis = {
    overdue,
    blocked,
    pendingDecisions,
    overloaded,
    mustDecide: pendingDecisions.map((d) => d.title),
    canDelegate: delegable,
    canAuto: [
      'Tạo task follow-up cho các blocker đang treo.',
      'Gom danh sách việc cá nhân hôm nay (personal view, không đụng dữ liệu chung).',
    ],
  }

  const delegateAction = delegable[0]
    ? (() => {
        const task = state.tasks.find((t) => t.title === delegable[0].taskTitle)!
        const freest = [...state.members].filter((m) => m.id !== FOUNDER_ID).sort((a, b) => loadRatio(a) - loadRatio(b))[0]
        return act(3, 'reassign', `Ủy quyền "${task.title}" → ${freest.name}`, `Bạn chịu trách nhiệm cuối cùng, nhưng việc này có thể ủy quyền. Cần bạn duyệt.`, {
          taskId: task.id,
          toMemberId: freest.id,
        })
      })()
    : undefined

  const followUps = blocked.map((t) =>
    act(2, 'create_task', `Tạo follow-up: "Gỡ blocker — ${t.title}"`, `Blocker hiện tại: task bị treo, cần phân xử lý rõ ràng.`, {
      title: `Gỡ blocker — ${t.title}`,
      projectId: t.projectId,
      assigneeId: t.assigneeId,
      due: iso(2),
      priority: 'cao',
    }),
  )

  const todayIds = myTasks.filter((t) => isOverdue(t) || new Date(t.due).getTime() < Date.now() + 2 * DAY).map((t) => t.id)
  const viewAction = todayIds.length
    ? act(2, 'create_view', `Tạo personal view "Việc của tôi hôm nay"`, undefined, {
        title: 'Việc của tôi hôm nay',
        taskIds: todayIds,
      })
    : undefined

  const actions = [...followUps, viewAction, delegateAction].filter(Boolean) as PlanAction[]

  const plan = makePlan(
    'executive',
    'Kế hoạch xử lý theo thẩm quyền của Founder',
    [
      `Tổng hợp: ${overdue.length} task trễ, ${blocked.length} blocker, ${pendingDecisions.length} quyết định chờ.`,
      overloaded.length ? `Quá tải: ${overloaded.map((m) => m.name).join(', ')}.` : 'Workload team trong ngưỡng an toàn.',
      'Phân loại: việc bạn phải tự quyết / việc có thể ủy quyền / việc tôi được phép tự xử lý (L2).',
    ],
    actions,
    [
      'Các task follow-up mới sẽ xuất hiện trong dự án tương ứng.',
      delegateAction ? 'Ủy quyền (L3) chỉ thực hiện sau khi bạn duyệt.' : 'Không có thay đổi phân công trong kế hoạch này.',
    ],
  )

  const text =
    `Tình hình hôm nay: ${overdue.length} task trễ, ${blocked.length} blocker, ${pendingDecisions.length} quyết định đang chờ bạn.` +
    (overloaded.length ? ` ${overloaded.map((m) => m.name).join(' và ')} đang quá tải.` : '') +
    ` Tôi đã tách việc bạn phải tự quyết, việc có thể ủy quyền và việc tôi được phép tự xử lý — xem kế hoạch bên dưới.`

  return { text, analysis, plan }
}
