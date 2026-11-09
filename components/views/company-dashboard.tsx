'use client'

import { fmtDate, isOverdue } from '@/lib/copilot-engine'
import { useWorkOS } from '@/lib/store'
import { Bar, HealthBadge, SectionLabel, Stat } from '@/components/ui-bits'
import { FinancePanel } from '@/components/finance-panel'

export function CompanyDashboard() {
  const { state } = useWorkOS()
  const overdue = state.tasks.filter(isOverdue)
  const blocked = state.tasks.filter((t) => t.blocked && t.status !== 'done')
  const pending = state.decisions.filter((d) => d.status === 'pending')
  const overloaded = state.members.filter((m) => m.load / m.capacity >= 0.9)
  const avgLoad = Math.round((state.members.reduce((s, m) => s + m.load / m.capacity, 0) / state.members.length) * 100)

  return (
    <div className="space-y-8">
      {/* Top Stats: High Contrast Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 ring-1 ring-rose-500/10">
          <div className="os-label text-rose-500">Task trễ</div>
          <div className="mt-1 text-3xl font-bold text-rose-500">{overdue.length}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 ring-1 ring-amber-500/10">
          <div className="os-label text-amber-500">Blocker</div>
          <div className="mt-1 text-3xl font-bold text-amber-500">{blocked.length}</div>
        </div>
        <div className="rounded-2xl border border-signal/20 bg-signal/5 p-4 ring-1 ring-signal/10">
          <div className="os-label text-signal">Quyết định chờ</div>
          <div className="mt-1 text-3xl font-bold text-signal">{pending.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
          <div className="os-label text-zinc-500">Quá tải</div>
          <div className="mt-1 text-3xl font-bold text-zinc-300">{overloaded.length}</div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Project Health (Main Focus) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Sức khỏe dự án</SectionLabel>
            <div className="text-[11px] text-zinc-500 font-mono">Tổng số: {state.projects.length}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.projects.map((p) => (
              <div key={p.id} className="group rounded-xl border bg-card p-4 transition-all hover:border-signal/50 hover:bg-zinc-900/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-zinc-100 group-hover:text-signal transition-colors">{p.name}</div>
                  <HealthBadge health={p.health} />
                </div>
                <div className="os-label mt-1 text-zinc-500">{p.client ?? 'Nội bộ'}</div>
                <div className="mt-4 flex items-center gap-3">
                  <Bar value={p.progress} max={100} className="flex-1 h-1.5 rounded-full bg-zinc-800" />
                  <span className="font-mono text-xs tabular-nums text-zinc-400">{p.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Critical Risks & Workload */}
        <section className="space-y-6">
          <div className="space-y-3">
            <SectionLabel>Rủi ro khẩn cấp</SectionLabel>
            <div className="space-y-2">
              {[...overdue, ...blocked].length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
                  <p className="text-xs text-zinc-600">Hệ thống ổn định, không có rủi ro.</p>
                </div>
              ) : (
                [...overdue, ...blocked].slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border bg-zinc-950/50 px-3 py-2.5 ring-1 ring-zinc-800">
                    <span className={`size-1.5 shrink-0 rounded-full ${isOverdue(t) ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">{t.title}</div>
                    <div className="os-label shrink-0 text-zinc-600">{fmtDate(t.due)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-zinc-950/50 p-4 ring-1 ring-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Workload toàn công ty</SectionLabel>
              <span className="font-mono text-xs font-bold text-signal">{avgLoad}%</span>
            </div>
            <Bar value={avgLoad} max={100} className="h-2 rounded-full bg-zinc-800" />
            <p className="mt-2 text-[10px] text-zinc-600 leading-relaxed">
              Trung bình tải việc của {state.members.length} nhân sự.
            </p>
          </div>
        </section>
      </div>

      <FinancePanel />
    </div>
  )
}
