'use client'

import { useEffect, useState } from 'react'
import { Settings, Check, AlertCircle, Key, Link2, Cpu } from 'lucide-react'
import { PROVIDER_META, type AIProviderKind } from '@/lib/ai-provider'

const KINDS: AIProviderKind[] = ['bedrock', 'muse-spark', 'custom']

export function AIProviderPanel() {
  const [provider, setProvider] = useState<AIProviderKind>('bedrock')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [maskedKey, setMaskedKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  async function load() {
    setStatus('loading')
    try {
      const res = await fetch('/api/ai-provider')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không tải được cấu hình')
      setProvider(KINDS.includes(data.provider) ? data.provider : 'bedrock')
      setBaseUrl(data.baseUrl ?? '')
      setModel(data.model ?? '')
      setMaskedKey(data.maskedKey ?? '')
      setHasKey(Boolean(data.hasKey))
      setStatus('idle')
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Không tải được cấu hình')
    }
  }

  useEffect(() => {
    load()
  }, [])

  function switchProvider(p: AIProviderKind) {
    setProvider(p)
    setStatus('idle')
    setMessage('')
  }

  async function save() {
    setStatus('saving')
    setMessage('')
    try {
      const res = await fetch('/api/ai-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey, model }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lưu thất bại')
      setBaseUrl(data.baseUrl ?? '')
      setModel(data.model ?? '')
      setMaskedKey(data.maskedKey ?? '')
      setHasKey(Boolean(data.hasKey))
      setApiKey('')
      setStatus('success')
      setMessage(`Đã lưu cấu hình ${PROVIDER_META[provider].label} — model ${data.model}`)
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Lưu thất bại')
    }
  }

  const meta = PROVIDER_META[provider]

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="size-4 text-muted-foreground" />
        <h3 className="font-semibold">Cấu hình AI Provider</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => switchProvider(k)}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                provider === k ? 'bg-signal/15 text-signal' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {PROVIDER_META[k].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{meta.hint}</p>

        <label className="block space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Link2 className="size-3 text-muted-foreground" /> Base URL
          </span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={meta.urlPlaceholder}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-1 ring-signal"
          />
        </label>

        <label className="block space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Key className="size-3 text-muted-foreground" /> {meta.keyLabel}
            {hasKey ? <span className="font-mono text-muted-foreground">({maskedKey || 'đã lưu'} — để trống để giữ nguyên)</span> : null}
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? 'Để trống để giữ key cũ' : meta.keyPlaceholder}
            autoComplete="off"
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-1 ring-signal"
          />
        </label>

        <label className="block space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Cpu className="size-3 text-muted-foreground" /> Tên model
          </span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={meta.defaultModel || 'model-name'}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-1 ring-signal"
          />
        </label>

        <button
          onClick={save}
          disabled={status === 'saving' || status === 'loading'}
          className="w-full rounded-md bg-signal px-3 py-2 text-sm font-medium text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'saving' ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 rounded-md bg-safe/10 p-2 text-safe">
            <Check className="size-4" />
            <span>{message}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-md bg-caution/10 p-2 text-caution">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
