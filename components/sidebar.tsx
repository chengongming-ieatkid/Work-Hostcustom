'use client'

import { Bot, Building2, FolderKanban, ListTodo, LogOut, ScrollText, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ViewKey } from '@/lib/types'
import { useWorkOS } from '@/lib/store'
import { isOverdue } from '@/lib/copilot-engine'

const NAV: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }>; feature?: string }[] = [
  { key: 'copilot', label: 'AI Copilot', icon: Bot },
  { key: 'my-work', label: 'My Work', icon: ListTodo, feature: 'myWork' },
  { key: 'company', label: 'Team Pulse', icon: Building2, feature: 'company' },
  { key: 'projects', label: 'Work in Progress', icon: FolderKanban, feature: 'projects' },
  { key: 'members', label: 'People', icon: Users, feature: 'projects' },
  { key: 'workload', label: 'Team Workload', icon: Users, feature: 'workload' },
  { key: 'activity', label: 'Activity & Decisions', icon: ScrollText, feature: 'activity' },
]

export function Sidebar({ view, onView, onOpenSettings }: { view: ViewKey; onView: (v: ViewKey) => void; onOpenSettings?: () => void }) {
  const { state, ui, user, logout } = useWorkOS()
  const overdue = state.tasks.filter(isOverdue).length
  const pending = state.decisions.filter((d) => d.status === 'pending').length

  const badges: Partial<Record<ViewKey, number>> = { 'my-work': pending, company: overdue }

  return (
    <aside className="hidden shrink-0 flex-col border-r border-zinc-800/80 md:flex" style={{ width: 'var(--sidebar-width, 15rem)', backgroundColor: 'var(--sidebar)' }}>
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-[13px] font-bold text-signal-foreground">{(ui.appName || "T").trim().charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold leading-tight text-zinc-50">{ui.appName}</div>
            <div className="truncate text-xs leading-tight text-zinc-500">Self-Adaptive Workspace</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.filter((n) => !n.feature || ui.features[n.feature as keyof typeof ui.features]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onView(key)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
              view === key ? 'bg-signal/12 text-foreground' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badges[key] ? (
              <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">{badges[key]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="border-t p-4">
        {onOpenSettings ? (
          <button
            onClick={onOpenSettings}
            className="mb-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            <Settings className="size-4 shrink-0" />
            <span className="flex-1">Cài đặt & Dữ liệu</span>
          </button>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-100">F</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-zinc-100">Founder</div>
            <div className="text-[11px] text-zinc-500">Quản trị hệ thống</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
