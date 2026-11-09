'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { interpret } from '@/lib/copilot-engine'
import { interpretWithAI, clearHistory } from '@/lib/copilot-ai'
import { handleSlashCommand, downloadState } from '@/lib/slash-commands'
import { useWorkOS } from '@/lib/store'
import { sanitizeDesign } from '@/lib/design'
import type { CopilotReply, Plan, ViewKey, WidgetSpec } from '@/lib/types'
import { PlanCard } from './plan-card'
import { AnalysisCard } from './analysis-card'
import { WidgetCard } from './widget-card'
import { Markdown } from '@/components/markdown'

interface Msg {
  id: string
  role: 'user' | 'copilot'
  text: string
  reply?: CopilotReply
  widget?: WidgetSpec
  executed?: boolean
}

const SUGGESTIONS = [
  'Thêm Lan Phạm làm Frontend, tạo dự án App Tay Vịn và gán Lan vào dự án',
  'Dự án App Tay Vịn trị giá 200 triệu, khách đã trả 80 triệu, hạn thu 20/11',
  'Tắt Team Workload, đổi tên app thành TVQ Ops và mở Projects',
  'Cho tôi biểu đồ workload của team',
  '/help',
]

const VIEW_LABELS: Record<ViewKey, string> = {
  copilot: 'Work Copilot',
  'my-work': 'My Work',
  company: 'Company Dashboard',
  projects: 'Projects',
  members: 'Nhân sự',
  workload: 'Team Workload',
  activity: 'Activity & Decisions',
}

function uid() {
  return `msg-${crypto.randomUUID()}`
}

export function CopilotPanel({ onClose, onNavigate }: { onClose?: () => void; onNavigate?: (v: ViewKey) => void }) {
  const { state, ui, applyPlan, rejectPlan, setUI, resetAll, canFinance, user } = useWorkOS()
  const [mode, setMode] = useState<'command' | 'executive'>('command')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [aiModel, setAiModel] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: uid(),
      role: 'copilot',
      text:
        'Chào bạn. Tôi có thể **thêm nhân viên**, **tạo dự án**, **gán người vào dự án**, tạo việc, đổi giao diện và mở đúng màn hình bạn cần — ngay trong hệ thống này. Bật **Thực thi trực tiếp** để việc thường ngày chạy ngay; việc xoá/đổi người vẫn chờ bạn duyệt. Gõ `/help` để xem lệnh nhanh.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    fetch('/api/copilot')
      .then((r) => r.json())
      .then((d) => {
        if (d.model) setAiModel(String(d.model))
      })
      .catch(() => {})
  }, [])

  function applyUiAndNavigate(plan: Plan) {
    for (const action of plan.actions) {
      if (action.type === 'set_feature' && action.payload) {
        const p = action.payload as Record<string, unknown>
        const key = String(p.feature ?? '')
        if (key in ui.features) {
          setUI({ features: { ...ui.features, [key]: Boolean(p.enabled) } as typeof ui.features })
        }
      }
      if (action.type === 'upsert_section' && action.payload) {
        const p = action.payload as Record<string, unknown>
        const id = String(p.id ?? `sec-${crypto.randomUUID().slice(0, 8)}`)
        const view = (String(p.view ?? 'home') || 'home') as (typeof ui.sections)[number]['view']
        const next = [...ui.sections]
        const idx = next.findIndex((x) => x.id === id)
        const section = { id, title: String(p.title ?? 'Mục mới'), body: String(p.body ?? ''), view, order: p.order !== undefined ? Number(p.order) : next.length }
        if (idx >= 0) next[idx] = section
        else next.push(section)
        setUI({ sections: next })
      }
      if (action.type === 'delete_section' && action.payload) {
        const id = String((action.payload as Record<string, unknown>).id ?? '')
        if (id) setUI({ sections: ui.sections.filter((x) => x.id !== id) })
      }
      if (action.type === 'set_ui' && action.payload) {
        const p = action.payload as Record<string, unknown>
        const patch: Record<string, unknown> = {}
        if (p.accent && ['sage', 'forest', 'amber', 'rose'].includes(String(p.accent))) patch.accent = p.accent
        if (p.density) patch.density = p.density
        if (p.projectLayout) patch.projectLayout = p.projectLayout
        if (p.copilotWidth) patch.copilotWidth = Number(p.copilotWidth)
        if (p.showCopilot !== undefined) patch.showCopilot = Boolean(p.showCopilot)
        if (p.autoExecute !== undefined) patch.autoExecute = Boolean(p.autoExecute)
        if (p.theme === 'light' || p.theme === 'dark') patch.theme = p.theme
        if (p.appName) patch.appName = String(p.appName)
        if (p.homeHeadline) patch.homeHeadline = String(p.homeHeadline)
        // Freeform design: arbitrary hex tokens, sizes and custom CSS (sanitized)
        const designPatch = sanitizeDesign({
          accentHex: p.accentHex,
          backgroundHex: p.backgroundHex,
          surfaceHex: p.surfaceHex,
          textHex: p.textHex,
          sidebarHex: p.sidebarHex,
          radiusPx: p.radiusPx,
          fontScale: p.fontScale,
          sidebarWidthPx: p.sidebarWidthPx,
          contentMaxWidthPx: p.contentMaxWidthPx,
          customCss: p.customCss,
        })
        const hasDesign = Object.keys(designPatch).length > 0 || p.resetDesign === true
        if (hasDesign) patch.design = p.resetDesign === true ? {} : { ...(ui.design ?? {}), ...designPatch }
        if (Object.keys(patch).length > 0) setUI(patch as Parameters<typeof setUI>[0])
      }
      if (action.type === 'navigate' && action.payload?.view) {
        const v = String(action.payload.view) as ViewKey
        if (onNavigate && v in VIEW_LABELS) onNavigate(v)
      }
    }
  }

  function executePlan(plan: Plan) {
    applyPlan(plan)
    applyUiAndNavigate(plan)
  }

  async function send(raw?: string) {
    const prompt = (raw ?? input).trim()
    if (!prompt || loading) return

    // Slash commands — instant, no AI
    const slash = handleSlashCommand(prompt, state)
    if (slash.handled) {
      if (slash.action === 'reset') resetAll()
      if (slash.action === 'export') downloadState(state)
      if (slash.action === 'clear-chat') {
        setMsgs([{ id: uid(), role: 'copilot', text: 'Đã xoá lịch sử chat. Tôi có thể giúp gì tiếp?' }])
        clearHistory()
        setInput('')
        return
      }
      setMsgs((m) => [
        ...m,
        { id: uid(), role: 'user', text: prompt },
        { id: uid(), role: 'copilot', text: slash.text ?? 'Đã thực hiện.' },
      ])
      setInput('')
      return
    }

    setLoading(true)
    try {
      let reply: CopilotReply = useAI ? await interpretWithAI(prompt, state, mode, { features: ui.features as unknown as Record<string, boolean>, sections: ui.sections.map((x) => ({ id: x.id, title: x.title, view: x.view })), appName: ui.appName, projectLayout: ui.projectLayout, accent: ui.accent, theme: ui.theme, design: ui.design as unknown as Record<string, unknown> }) : interpret(prompt, state, mode)

      // Permission guard: only Admin may change payroll, regardless of what the model proposed
      if (reply.plan && !canFinance && reply.plan.actions.some((a) => a.type === 'set_member_pay' || a.type === 'add_pay_item' || a.type === 'update_pay_item' || a.type === 'delete_pay_item')) {
        reply = {
          text: `Tài khoản của bạn (${user?.role ?? 'member'}) không có quyền thay đổi lương/thù lao. Chỉ Admin mới thực hiện được thao tác này — kế hoạch đã bị chặn và không có gì được thay đổi.`,
        }
      }

      // Auto-execute: L1/L2 plans run immediately; L3 still needs approval
      let executed = false
      if (reply.plan && ui.autoExecute) {
        const hasL3 = reply.plan.actions.some((a) => a.level === 3)
        if (!hasL3) {
          executePlan(reply.plan)
          reply = { ...reply, plan: { ...reply.plan, status: 'approved' } }
          executed = true
        }
      }

      // UI + navigation are safe and apply immediately; data actions still follow approval/auto rules
      if (reply.plan && !executed) {
        const hasUiOrNav = reply.plan.actions.some((a) => a.type === 'set_ui' || a.type === 'navigate' || a.type === 'set_feature' || a.type === 'upsert_section' || a.type === 'delete_section')
        const onlyUiNav = reply.plan.actions.every((a) => a.type === 'set_ui' || a.type === 'navigate' || a.type === 'set_feature' || a.type === 'upsert_section' || a.type === 'delete_section' || a.type === 'note')
        if (hasUiOrNav) applyUiAndNavigate(reply.plan)
        if (onlyUiNav && hasUiOrNav) {
          reply = { ...reply, plan: { ...reply.plan, status: 'approved' } }
          executed = true
        }
      }

      setMsgs((m) => [
        ...m,
        { id: uid(), role: 'user', text: prompt },
        { id: uid(), role: 'copilot', text: reply.text, reply, widget: reply.widget, executed },
      ])
      setInput('')
    } catch (error) {
      console.error('Error processing message:', error)
      setMsgs((m) => [
        ...m,
        { id: uid(), role: 'user', text: prompt },
        { id: uid(), role: 'copilot', text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function decide(plan: Plan, approved: boolean) {
    if (approved) executePlan(plan)
    else rejectPlan(plan)
    setMsgs((m) =>
      m.map((msg) =>
        msg.reply?.plan?.id === plan.id
          ? { ...msg, reply: { ...msg.reply, plan: { ...plan, status: approved ? 'approved' : 'rejected' } } }
          : msg,
      ),
    )
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold text-zinc-50">Work Copilot</div>
          <div className="mt-0.5 text-[11px] text-zinc-500">Thao tác trực tiếp trên dữ liệu thật</div>
        </div>
        {onClose ? (
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden" aria-label="Đóng Copilot">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-1 border-b p-2">
        {(['command', 'executive'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors',
              mode === m ? 'bg-signal/15 text-signal' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {m === 'command' ? 'Ra lệnh' : 'Phân tích'}
          </button>
        ))}
      </div>

      {/* Toggles: AI + Auto-execute */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">AI{aiModel ? ` (${aiModel})` : ''}</span>
        <button
          onClick={() => {
            setUseAI(!useAI)
            if (!useAI) clearHistory()
          }}
          className={cn('relative h-5 w-9 rounded-full transition-colors', useAI ? 'bg-signal' : 'bg-muted')}
          aria-label="Bật/tắt AI"
        >
          <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform', useAI ? 'translate-x-4' : 'translate-x-0')} />
        </button>
      </div>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="size-3.5" /> Thực thi trực tiếp (L1/L2)
        </span>
        <button
          onClick={() => setUI({ autoExecute: !ui.autoExecute })}
          className={cn('relative h-5 w-9 rounded-full transition-colors', ui.autoExecute ? 'bg-signal' : 'bg-muted')}
          aria-label="Bật/tắt thực thi trực tiếp"
        >
          <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform', ui.autoExecute ? 'translate-x-4' : 'translate-x-0')} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.map((m) => (
          <div key={m.id} className={cn('space-y-2', m.role === 'user' && 'flex justify-end')}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-lg rounded-br-sm bg-signal/15 px-3.5 py-2.5 text-[13px] leading-relaxed">{m.text}</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-300">Copilot</span>
                  {m.executed ? (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-safe/40 bg-safe/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-safe">
                      <Zap className="size-3" /> Đã thực thi
                    </span>
                  ) : null}
                </div>
                <div className="text-[13px] leading-relaxed text-foreground/90">
                  <Markdown text={m.text} />
                </div>
                {m.widget ? <WidgetCard widget={m.widget} /> : null}
                {m.reply?.analysis ? <AnalysisCard analysis={m.reply.analysis} /> : null}
                {m.reply?.plan ? <PlanCard plan={m.reply.plan} onApprove={(p) => decide(p, true)} onReject={(p) => decide(p, false)} /> : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {msgs.length <= 1 ? (
        <div className="space-y-1.5 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="w-full rounded-md border px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-signal/40 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-t p-3">
        <div className="flex items-end gap-2 rounded-lg border bg-background px-3 py-2 focus-within:border-signal/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !loading) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder={mode === 'command' ? 'Ví dụ: thêm nhân viên, tạo dự án, gán người, đổi giao diện…' : 'Hỏi về tiến độ, tải việc, rủi ro…'}
            className="max-h-32 flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-50"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="rounded-md bg-signal p-2 text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
            aria-label="Gửi"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
