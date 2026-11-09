'use client'

import { useRef, useState } from 'react'
import { FileText, Paperclip, UploadCloud, X } from 'lucide-react'
import { filesToAttachments, formatBytes } from '@/lib/attachments'
import { useWorkOS } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/types'

export function TaskAttachments({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { addTaskAttachments, removeTaskAttachment } = useWorkOS()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const attachments = task.attachments ?? []

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const parsed = await filesToAttachments(files)
      addTaskAttachments(task.id, parsed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          void handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'rounded-xl border border-dashed px-3 py-2.5 transition',
          dragOver ? 'border-zinc-300 bg-zinc-800/80' : 'border-zinc-800 bg-zinc-900/40',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <UploadCloud className="size-4" />
            {busy ? 'Đang đọc tài liệu…' : dragOver ? 'Thả file vào việc này' : compact ? 'Kéo thả tài liệu vào đây' : 'Kéo thả tài liệu vào công việc này'}
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-100 ring-1 ring-zinc-700 transition hover:bg-zinc-700"
          >
            <Paperclip className="size-3.5" /> Đính kèm
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a) => {
            const content = a.dataUrl ?? (a.text ? `data:text/plain;charset=utf-8,${encodeURIComponent(a.text)}` : undefined)
            const chip = (
              <>
                <FileText className="size-3.5 shrink-0 text-zinc-400" />
                <span className="max-w-44 truncate">{a.name}</span>
                <span className="shrink-0 text-[10px] text-zinc-500">{formatBytes(a.size)}</span>
              </>
            )
            return (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 py-1 pl-2.5 pr-1.5 text-[11px] text-zinc-200 ring-1 ring-zinc-700/70">
                {content ? (
                  <a href={content} download={a.name} className="inline-flex min-w-0 items-center gap-1.5 hover:text-white">
                    {chip}
                  </a>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-1.5" title="File lớn — chỉ lưu thông tin, không lưu nội dung">
                    {chip}
                  </span>
                )}
                <button type="button" onClick={() => removeTaskAttachment(task.id, a.id)} className="rounded-full p-0.5 text-zinc-500 hover:text-red-300" aria-label={`Xoá tài liệu ${a.name}`}>
                  <X className="size-3" />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
