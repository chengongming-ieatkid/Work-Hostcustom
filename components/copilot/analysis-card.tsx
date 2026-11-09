'use client'

import type { Analysis } from '@/lib/types'
import { fmtDate, isOverdue } from '@/lib/copilot-engine'
import { SectionLabel } from '@/components/ui-bits'

function Block({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <SectionLabel className="mb-1.5">{title}</SectionLabel>
      {items.length === 0 ? (
        <div className="text-[13px] text-muted-foreground">{empty}</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-signal" />
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AnalysisCard({ analysis }: { analysis: Analysis }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <SectionLabel>Executive Copilot — Phân tích tình hình</SectionLabel>
      </div>
      <div className="grid gap-4 px-4 py-3 sm:grid-cols-2">
        <Block
          title="Task trễ"
          empty="Không có task trễ."
          items={analysis.overdue.map((t) => `${t.title} · hạn ${fmtDate(t.due)}`)}
        />
        <Block
          title="Blocker"
          empty="Không có blocker."
          items={analysis.blocked.map((t) => `${t.title} · ${fmtDate(t.due)}`)}
        />
        <Block
          title="Bạn phải tự quyết định"
          empty="Không có quyết định nào chờ."
          items={analysis.mustDecide}
        />
        <Block
          title="Có thể ủy quyền"
          empty="Không có việc phù hợp để ủy quyền."
          items={analysis.canDelegate.map((d) => `${d.taskTitle} → ${d.suggestTo} (${d.reason})`)}
        />
        <div className="sm:col-span-2">
          <Block
            title="Tôi được phép tự xử lý (L2)"
            empty="Không có."
            items={analysis.canAuto}
          />
        </div>
      </div>
    </div>
  )
}

export { isOverdue }
