'use client'

import { useWorkOS } from '@/lib/store'
import { SectionLabel } from '@/components/ui-bits'

const resultStyle = {
  executed: 'text-safe',
  rejected: 'text-destructive',
  auto: 'text-signal',
} as const

const resultLabel = {
  executed: 'Đã thực hiện',
  rejected: 'Bị từ chối',
  auto: 'Tự động (L1)',
} as const

export function Activity() {
  const { state } = useWorkOS()

  return (
    <div className="space-y-3">
      <SectionLabel>Audit log — mọi prompt, kế hoạch và thao tác đều được ghi</SectionLabel>
      {state.audit.map((a) => (
        <div key={a.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {new Date(a.at).toLocaleString('vi-VN')} · {a.actor}
            </div>
            <span className={`font-mono text-[11px] uppercase tracking-wider ${resultStyle[a.result]}`}>{resultLabel[a.result]}</span>
          </div>
          <div className="mt-2 text-sm">{a.planTitle}</div>
          <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Prompt: “{a.prompt}”</div>
          <ul className="mt-2 space-y-1">
            {a.actions.map((act, i) => (
              <li key={i} className="font-mono text-[11px] leading-relaxed text-muted-foreground">→ {act}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
