'use client'

import { Check, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/types'
import { LevelBadge, SectionLabel } from '@/components/ui-bits'

export function PlanCard({ plan, onApprove, onReject }: {
  plan: Plan
  onApprove: (plan: Plan) => void
  onReject: (plan: Plan) => void
}) {
  const decided = plan.status !== 'pending'
  const needsApproval = plan.actions.some((a) => a.level === 3)

  return (
    <div className={cn('rounded-lg border bg-card', decided && 'opacity-80')}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <SectionLabel>Kế hoạch đề xuất</SectionLabel>
          <div className="mt-1 text-sm font-medium text-balance">{plan.title}</div>
        </div>
        {needsApproval ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-caution/50 bg-caution/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-caution">
            <ShieldCheck className="size-3" /> Chờ duyệt
          </span>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-3">
        <div>
          <SectionLabel className="mb-1.5">Phân tích & kiểm tra quyền</SectionLabel>
          <ul className="space-y-1">
            {plan.reasoning.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionLabel className="mb-1.5">Thao tác dự kiến</SectionLabel>
          <div className="space-y-1.5">
            {plan.actions.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 rounded-md border bg-background/60 px-3 py-2">
                <LevelBadge level={a.level} />
                <div className="min-w-0">
                  <div className="text-[13px] leading-snug">{a.summary}</div>
                  {a.detail ? <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.detail}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel className="mb-1.5">Tác động tới toàn công ty</SectionLabel>
          <ul className="space-y-1">
            {plan.impact.map((r, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-muted-foreground">· {r}</li>
            ))}
          </ul>
        </div>
      </div>

      {decided ? (
        <div
          className={cn(
            'border-t px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider',
            plan.status === 'approved' ? 'text-safe' : 'text-destructive',
          )}
        >
          {plan.status === 'approved' ? '✓ Đã duyệt — hệ thống đã thực hiện, audit log đã ghi' : '✕ Đã từ chối — audit log đã ghi'}
        </div>
      ) : (
        <div className="flex gap-2 border-t p-3">
          <button
            onClick={() => onApprove(plan)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-signal px-3 py-2 text-sm font-medium text-signal-foreground transition-opacity hover:opacity-90"
          >
            <Check className="size-4" /> Duyệt & thực hiện
          </button>
          <button
            onClick={() => onReject(plan)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" /> Từ chối
          </button>
        </div>
      )}
    </div>
  )
}
