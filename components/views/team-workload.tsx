'use client'

import { fmtDate } from '@/lib/copilot-engine'
import { useWorkOS } from '@/lib/store'
import { Bar } from '@/components/ui-bits'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?'
}

export function TeamWorkload() {
  const { state } = useWorkOS()

  if (state.members.length === 0) {
    return <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-500">Chưa có thành viên nào. Hãy nói với Copilot: “Thêm Lan Phạm làm Frontend”.</div>
  }

  return (
    <div className="space-y-3">
      {state.members.map((m) => {
        const tasks = state.tasks.filter((t) => t.assigneeId === m.id && t.status !== 'done')
        const projects = state.projects.filter((p) => (p.memberIds ?? []).includes(m.id))
        const ratio = m.capacity ? m.load / m.capacity : 0
        return (
          <article key={m.id} className="rounded-2xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-100">{initials(m.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-zinc-50">{m.name}</div>
                  <div className="truncate text-xs text-zinc-500">{m.role}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn('text-sm font-semibold tabular-nums', ratio >= 0.9 ? 'text-amber-300' : 'text-zinc-200')}>{Math.round(ratio * 100)}%</div>
                <div className="text-[11px] text-zinc-500">{ratio >= 0.9 ? 'Đang quá tải' : 'Còn nhận được việc'}</div>
              </div>
            </div>

            <div className="mt-3"><Bar value={m.load} max={m.capacity} /></div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-zinc-500">Dự án:</span>
              {projects.length === 0 ? <span className="text-xs text-zinc-600">Chưa tham gia dự án nào</span> : projects.map((p) => (
                <span key={p.id} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200">{p.name}</span>
              ))}
            </div>

            {tasks.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tasks.map((t) => (
                  <span key={t.id} className="rounded-full bg-zinc-800/70 px-2 py-1 text-[11px] text-zinc-400">{t.title} · {fmtDate(t.due)}</span>
                ))}
              </div>
            ) : <p className="mt-2.5 text-xs text-zinc-600">Chưa có việc đang mở.</p>}
          </article>
        )
      })}
      <p className="pt-1 text-xs leading-relaxed text-zinc-600">Copilot kiểm tra tải việc trước khi phân công. Người đang quá tải sẽ được cảnh báo và việc giao thêm cần bạn xác nhận.</p>
    </div>
  )
}
