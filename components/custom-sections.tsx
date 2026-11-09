'use client'

import { useWorkOS } from '@/lib/store'
import { Markdown } from '@/components/markdown'
import type { ViewKey } from '@/lib/types'

export function CustomSections({ view }: { view: ViewKey | 'home' }) {
  const { ui } = useWorkOS()
  const sections = [...(ui.sections ?? [])].filter((s) => s.view === view).sort((a, b) => a.order - b.order)
  if (sections.length === 0) return null
  return (
    <div className="mt-6 space-y-3">
      {sections.map((s) => (
        <section key={s.id} className="rounded-2xl bg-zinc-900/50 p-5 ring-1 ring-zinc-800">
          <h3 className="text-[14px] font-semibold text-zinc-50">{s.title}</h3>
          <div className="mt-2 text-[13px] leading-relaxed text-zinc-400">
            <Markdown text={s.body} />
          </div>
        </section>
      ))}
    </div>
  )
}
