'use client'

import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useWorkOS } from '@/lib/store'

const inputCls =
  'w-full rounded-xl bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-border placeholder:text-muted-foreground/70 focus:ring-signal'

const DEMO_ACCOUNTS = [
  { email: 'admin@tvq.local', password: 'admin123', label: 'Admin — xem & sửa tất cả, gồm lương' },
  { email: 'manager@tvq.local', password: 'manager123', label: 'Manager — sửa việc/dự án, không thấy lương' },
  { email: 'member@tvq.local', password: 'member123', label: 'Member — chỉ xem, không thấy lương' },
]

export function LoginScreen() {
  const { login } = useWorkOS()
  const [email, setEmail] = useState('admin@tvq.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await login(email, password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-signal text-base font-bold text-signal-foreground">T</div>
          <h1 className="mt-3 text-xl font-semibold text-foreground">TVQ Work Copilot</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Work smarter. Live healthier. Grow together.</p>
          <p className="mt-2 text-xs text-muted-foreground/80">Dữ liệu được lưu trên máy chủ. Lương chỉ hiển thị với Admin.</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-5 ring-1 ring-border">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="login-password">Mật khẩu</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
          </div>
          {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive ring-1 ring-destructive/25">{error}</p> : null}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-3 py-2.5 text-sm font-semibold text-signal-foreground transition hover:opacity-90 disabled:opacity-50">
            <LockKeyhole className="size-4" /> {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <div className="mt-4 space-y-1.5">
          <p className="text-center text-[11px] font-medium text-muted-foreground/80">Tài khoản mẫu (bấm để điền nhanh)</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.email} onClick={() => { setEmail(a.email); setPassword(a.password); setError(null) }} className="w-full rounded-xl px-3 py-2 text-left ring-1 ring-border transition hover:bg-accent">
              <span className="block text-xs font-medium text-foreground">{a.email} · {a.password}</span>
              <span className="block text-[11px] text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
