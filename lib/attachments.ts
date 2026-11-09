import type { TaskAttachment } from './types'

const MAX_INLINE_BYTES = 180_000 // keep localStorage safe; larger files store metadata only
const MAX_TEXT_CHARS = 12_000

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? '').slice(0, MAX_TEXT_CHARS))
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}

function isTextLike(file: File) {
  return file.type.startsWith('text/') || /\.(md|txt|csv|json|ts|tsx|js|jsx|html|css)$/i.test(file.name)
}

export async function filesToAttachments(files: FileList | File[]): Promise<TaskAttachment[]> {
  const list = Array.from(files)
  const out: TaskAttachment[] = []
  for (const file of list) {
    const base: TaskAttachment = {
      id: `f-${crypto.randomUUID().slice(0, 8)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      addedAt: new Date().toISOString(),
    }
    try {
      if (isTextLike(file) && file.size <= MAX_INLINE_BYTES * 4) {
        base.text = await readAsText(file)
      } else if (file.size <= MAX_INLINE_BYTES) {
        base.dataUrl = await readAsDataUrl(file)
      }
    } catch {
      // metadata-only fallback
    }
    out.push(base)
  }
  return out
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
