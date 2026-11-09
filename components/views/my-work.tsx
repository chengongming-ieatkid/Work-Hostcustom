'use client'

import { Check, X } from 'lucide-react'
import { FOUNDER_ID } from '@/lib/seed'
import { fmtDate, isOverdue } from '@/lib/copilot-engine'
import { useWorkOS } from '@/lib/store'
import { SectionLabel } from '@/components/ui-bits'
import type { Task } from '@/lib/types'

function TaskRow({ task, project, assignee }: { task: Task; project?: string; assignee?: string }) {
  const late = isOverdue(task)
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3.5 py-3">
      <span className={`size-1.5 shrink-0 rounded-full ${late ? 'bg-destructive' : task.priority === 'cao' ? 'bg-caution' : 'bg-signal'}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{task.title}</div>
        <div className="os-label mt-0.5">
          {project} · hạn {fmtDate(task.due)}
          {assignee ? ` · ${assignee}` : ''}
          {task.blocked ? ' · bị blocker' : ''}
        </div>
      </div>
      {late ? <span className="font-mono text-[10px] uppercase tracking-wider text-destructive">Trễ</span> : null}
    </div>
  )
}

export function MyWork() {
  const { state, resolveDecision } = useWorkOS()
  const mine = state.tasks.filter((t) => t.assigneeId === FOUNDER_ID && t.status !== 'done')
  const pending = state.decisions.filter((d) => d.status === 'pending')
  const delegable = mine.filter((t) => t.priority !== 'cao')
  const views = state.personalViews

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionLabel>Cần bạn quyết định ({pending.length})</SectionLabel>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có quyết định nào đang chờ.</p>
        ) : (
          pending.map((d) => (
            <div key={d.id} className="rounded-lg border bg-card p-4">
              <div className="text-sm font-medium">{d.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d.context}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => resolveDecision(d.id, true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-safe/15 px-3 py-1.5 text-xs font-medium text-safe transition-opacity hover:opacity-85"
                >
                  <Check className="size-3.5" /> Phê duyệt
                </button>
                <button
                  onClick={() => resolveDecision(d.id, false)}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" /> Từ chối
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {views.length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>Danh sách cá nhân do Copilot tạo</SectionLabel>
          {views.map((v) => (
            <div key={v.id} className="rounded-lg border border-signal/30 bg-signal/5 p-4">
              <div className="text-sm font-medium">{v.title}</div>
              <div className="mt-2 space-y-1.5">
                {v.taskIds.map((id) => {
                  const t = state.tasks.find((x) => x.id === id)
                  if (!t) return null
                  return <TaskRow key={id} task={t} project={state.projects.find((p) => p.id === t.projectId)?.name} />
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionLabel>Đang phụ trách ({mine.length})</SectionLabel>
        {mine.map((t) => (
          <TaskRow key={t.id} task={t} project={state.projects.find((p) => p.id === t.projectId)?.name} />
        ))}
      </section>

      <section className="space-y-3">
        <SectionLabel>Có thể ủy quyền</SectionLabel>
        {delegable.length === 0 ? (
          <p className="text-sm text-muted-foreground">Mọi việc ưu tiên cao đang do bạn trực tiếp phụ trách.</p>
        ) : (
          delegable.map((t) => (
            <TaskRow key={t.id} task={t} project={state.projects.find((p) => p.id === t.projectId)?.name} />
          ))
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Trách nhiệm cuối cùng vẫn thuộc về bạn — Copilot chỉ đề xuất ủy quyền và chờ bạn duyệt (L3).
        </p>
      </section>
    </div>
  )
}
