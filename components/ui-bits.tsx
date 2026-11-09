import { cn } from '@/lib/utils'
import type { ActionLevel, ProjectHealth } from '@/lib/types'

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('os-label', className)}>{children}</div>
}

const levelStyles: Record<ActionLevel, string> = {
  1: 'border-safe/40 text-safe bg-safe/10',
  2: 'border-signal/40 text-signal bg-signal/10',
  3: 'border-caution/50 text-caution bg-caution/10',
}

const levelNames: Record<ActionLevel, string> = {
  1: 'L1 · An toàn',
  2: 'L2 · Đảo ngược được',
  3: 'L3 · Cần duyệt',
}

export function LevelBadge({ level, full = false }: { level: ActionLevel; full?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        levelStyles[level],
      )}
    >
      {full ? levelNames[level] : `L${level}`}
    </span>
  )
}

const healthStyles: Record<ProjectHealth, { label: string; cls: string }> = {
  'on-track': { label: 'Đúng tiến độ', cls: 'border-safe/40 text-safe bg-safe/10' },
  risk: { label: 'Rủi ro', cls: 'border-caution/50 text-caution bg-caution/10' },
  delayed: { label: 'Trễ', cls: 'border-destructive/50 text-destructive bg-destructive/10' },
}

export function HealthBadge({ health }: { health: ProjectHealth }) {
  const s = healthStyles[health]
  return (
    <span className={cn('inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', s.cls)}>
      {s.label}
    </span>
  )
}

export function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const tone = pct >= 90 ? 'bg-caution' : pct >= 70 ? 'bg-signal' : 'bg-safe'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' | 'danger' }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <SectionLabel>{label}</SectionLabel>
      <div
        className={cn(
          'mt-2 font-mono text-3xl tabular-nums',
          tone === 'danger' && value !== 0 && 'text-destructive',
          tone === 'warn' && value !== 0 && 'text-caution',
        )}
      >
        {value}
      </div>
    </div>
  )
}
