'use client'

import { Bar } from '@/components/ui-bits'
import type { WidgetSpec } from '@/lib/types'

export function WidgetCard({ widget }: { widget: WidgetSpec }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{widget.title}</div>

      {widget.kind === 'stat' ? (
        <div>
          <div className="font-mono text-3xl tabular-nums">{widget.value ?? '—'}</div>
          {widget.sub ? <div className="mt-1 text-xs text-muted-foreground">{widget.sub}</div> : null}
        </div>
      ) : null}

      {widget.kind === 'table' && widget.columns && widget.rows ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b bg-muted/40">
                {widget.columns.map((c, i) => (
                  <th key={i} className="px-2.5 py-1.5 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {widget.rows.map((r, ri) => (
                <tr key={ri} className="border-b last:border-b-0">
                  {r.map((cell, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {widget.kind === 'bars' && widget.items ? (
        <div className="space-y-2.5">
          {widget.items.map((item, i) => (
            <div key={i}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
                <span className="min-w-0 truncate">{item.label}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {item.value}
                  {item.max ? `/${item.max}` : ''}
                </span>
              </div>
              <Bar value={item.value} max={item.max ?? 100} />
              {item.hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {widget.kind === 'list' && widget.items ? (
        <ul className="space-y-1.5">
          {widget.items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{item.hint ?? item.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
