'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Database, X } from 'lucide-react'
import { useWorkOS } from '@/lib/store'
import { FOUNDER_ID } from '@/lib/seed'
import type { Priority, ProjectHealth, TaskStatus } from '@/lib/types'
import { SectionLabel } from '@/components/ui-bits'

type Tab = 'members' | 'projects' | 'tasks' | 'decisions'

const TABS: { key: Tab; label: string }[] = [
  { key: 'members', label: 'Thành viên' },
  { key: 'projects', label: 'Dự án' },
  { key: 'tasks', label: 'Task' },
  { key: 'decisions', label: 'Quyết định' },
]

const inputCls =
  'w-full rounded-md border bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-signal/50'
const labelCls = 'mb-1 block text-[11px] font-medium text-muted-foreground'

const ACCENTS: { key: string; label: string; swatch: string }[] = [
  { key: 'sage', label: 'Sage', swatch: '#7ba889' },
  { key: 'forest', label: 'Forest', swatch: '#3d6b4f' },
  { key: 'amber', label: 'Hổ phách', swatch: '#c98f3d' },
  { key: 'rose', label: 'Hồng đất', swatch: '#c26a72' },
]

export function DataManager({ onClose }: { onClose?: () => void }) {
  const { ui, setUI } = useWorkOS()
  const {
    state,
    addMember,
    updateMember,
    removeMember,
    addProject,
    updateProject,
    removeProject,
    assignMemberToProject,
    unassignMemberFromProject,
    addTask,
    updateTask,
    removeTask,
    addDecision,
    removeDecision,
    resetAll,
  } = useWorkOS()
  const [tab, setTab] = useState<Tab>('members')

  // member form
  const [mName, setMName] = useState('')
  const [mRole, setMRole] = useState('')
  const [mCap, setMCap] = useState('8')

  // project form
  const [pName, setPName] = useState('')
  const [pClient, setPClient] = useState('')
  const [pMembers, setPMembers] = useState<string[]>([])

  // task form
  const [tTitle, setTTitle] = useState('')
  const [tProject, setTProject] = useState('')
  const [tAssignee, setTAssignee] = useState(FOUNDER_ID)
  const [tDue, setTDue] = useState(new Date().toISOString().slice(0, 10))
  const [tPriority, setTPriority] = useState<Priority>('trung bình')

  // decision form
  const [dTitle, setDTitle] = useState('')
  const [dContext, setDContext] = useState('')

  function submitMember() {
    if (!mName.trim()) return
    addMember({ name: mName.trim(), role: mRole.trim() || 'Thành viên', capacity: Number(mCap) || 8, load: 0 })
    setMName('')
    setMRole('')
  }

  function submitProject() {
    if (!pName.trim()) return
    addProject({ name: pName.trim(), client: pClient.trim() || undefined, health: 'on-track', progress: 0, memberIds: pMembers })
    setPName('')
    setPClient('')
    setPMembers([])
  }

  function togglePMember(id: string) {
    setPMembers((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function submitTask() {
    if (!tTitle.trim() || !tProject) return
    addTask({ title: tTitle.trim(), projectId: tProject, assigneeId: tAssignee, due: tDue, priority: tPriority, status: 'todo' })
    setTTitle('')
  }

  function submitDecision() {
    if (!dTitle.trim()) return
    addDecision({ title: dTitle.trim(), context: dContext.trim() })
    setDTitle('')
    setDContext('')
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">Cài đặt & dữ liệu</div>
            <div className="os-label mt-0.5">Mọi thay đổi áp dụng ngay và được Copilot sử dụng</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm('Xoá toàn bộ dữ liệu và bắt đầu lại?')) resetAll()
            }}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          >
            Reset
          </button>
          {onClose ? (
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Đóng">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b p-4">
        <UsersAdmin />
      </div>

      <div className="space-y-3 border-b p-4">
        <SectionLabel>Giao diện ứng dụng</SectionLabel>
        <div>
          <div className={labelCls}>Chế độ giao diện</div>
          <div className="flex gap-1">
            {(['dark', 'light'] as const).map((t) => (
              <button key={t} onClick={() => setUI({ theme: t })} className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${ui.theme === t ? 'border-signal/60 bg-signal/10 text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                {t === 'dark' ? 'Tối (Dark)' : 'Sáng (Light)'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={labelCls}>Màu chủ đạo</div>
          <div className="flex gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                onClick={() => setUI({ accent: a.key as typeof ui.accent })}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                  ui.accent === a.key ? 'border-signal/60 bg-signal/10 text-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <span className="size-3 rounded-full" style={{ backgroundColor: a.swatch }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <DesignEditor />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={labelCls}>Mật độ hiển thị</div>
            <div className="flex gap-1">
              {(['comfortable', 'compact'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setUI({ density: d })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                    ui.density === d ? 'border-signal/60 bg-signal/10 text-foreground' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {d === 'comfortable' ? 'Thoải mái' : 'Gọn'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={labelCls}>Layout dự án</div>
            <div className="flex gap-1">
              {(['grid', 'list', 'board'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setUI({ projectLayout: l })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                    ui.projectLayout === l ? 'border-signal/60 bg-signal/10 text-foreground' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {l === 'grid' ? 'Lưới' : l === 'list' ? 'Danh sách' : 'Board'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px]">Thực thi trực tiếp</div>
            <div className="text-[11px] text-muted-foreground">Plan L1/L2 chạy ngay, không cần bấm Duyệt (L3 vẫn chờ duyệt)</div>
          </div>
          <button
            onClick={() => setUI({ autoExecute: !ui.autoExecute })}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ui.autoExecute ? 'bg-signal' : 'bg-muted'}`}
            aria-label="Bật/tắt thực thi trực tiếp"
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${ui.autoExecute ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="space-y-2 rounded-xl bg-zinc-800/40 p-3 ring-1 ring-zinc-800">
          <div>
            <div className="text-[13px] font-medium text-zinc-100">Tính năng website</div>
            <div className="text-[11px] text-zinc-500">Bật/tắt ngay không cần sửa code — Copilot cũng làm được việc này qua prompt.</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              ['projects', 'Màn hình Projects'],
              ['workload', 'Team Workload'],
              ['company', 'Company Dashboard'],
              ['activity', 'Activity & Decisions'],
              ['myWork', 'My Work'],
              ['projectMembers', 'Thành viên dự án'],
              ['taskAttachments', 'Tài liệu trong việc'],
              ['progressSlider', 'Thanh kéo tiến độ'],
              ['finance', 'Tài chính & thù lao'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setUI({ features: { ...ui.features, [key]: !ui.features[key] } })} className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ring-1 transition ${ui.features[key] ? 'bg-zinc-800 text-zinc-100 ring-zinc-600' : 'text-zinc-500 ring-zinc-800 hover:text-zinc-300'}`}>
                <span>{label}</span><span className={`relative h-4 w-7 rounded-full ${ui.features[key] ? 'bg-emerald-400' : 'bg-zinc-700'}`}><span className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform ${ui.features[key] ? 'translate-x-3' : ''}`} /></span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div><div className={labelCls}>Tên ứng dụng</div><input defaultValue={ui.appName} onBlur={(e) => setUI({ appName: e.target.value.trim() || 'TVQ Work' })} className={inputCls} /></div>
            <div><div className={labelCls}>Tiêu đề trang chủ</div><input defaultValue={ui.homeHeadline} onBlur={(e) => setUI({ homeHeadline: e.target.value.trim() || ui.homeHeadline })} className={inputCls} /></div>
          </div>
          {ui.sections.length > 0 ? (
            <div className="space-y-1 pt-1">
              <div className={labelCls}>Mục tuỳ chỉnh do prompt thêm vào ({ui.sections.length})</div>
              {ui.sections.map((sec) => (
                <div key={sec.id} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-2.5 py-1.5 text-xs ring-1 ring-zinc-800">
                  <span className="min-w-0 truncate text-zinc-300">{sec.title} <span className="text-zinc-600">· {sec.view}</span></span>
                  <button onClick={() => setUI({ sections: ui.sections.filter((x) => x.id !== sec.id) })} className="ml-2 shrink-0 text-zinc-500 hover:text-red-300">Xoá</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <div className={labelCls}>Độ rộng Copilot: {ui.copilotWidth}px</div>
          <input
            type="range"
            min={360}
            max={560}
            step={20}
            value={ui.copilotWidth}
            onChange={(e) => setUI({ copilotWidth: Number(e.target.value) })}
            className="w-full"
            aria-label="Độ rộng Copilot"
          />
        </div>
      </div>

      <div className="flex gap-1 border-b p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-signal/15 text-signal' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {t.label} ({t.key === 'members' ? state.members.length : t.key === 'projects' ? state.projects.length : t.key === 'tasks' ? state.tasks.length : state.decisions.length})
          </button>
        ))}
      </div>

      <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
        {tab === 'members' ? (
          <>
            <div className="grid grid-cols-[1fr_1fr_70px_auto] gap-2">
              <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Tên" className={inputCls} />
              <input value={mRole} onChange={(e) => setMRole(e.target.value)} placeholder="Vai trò" className={inputCls} />
              <input value={mCap} onChange={(e) => setMCap(e.target.value)} type="number" min="1" placeholder="Cap" className={inputCls} />
              <button onClick={submitMember} className="rounded-md bg-signal px-3 text-signal-foreground hover:opacity-90" aria-label="Thêm thành viên">
                <Plus className="size-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {state.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">
                      {m.name} <span className="font-mono text-[10px] text-muted-foreground">({m.id})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.role} · Tải {m.load}/{m.capacity} · {(state.projects.filter((p) => (p.memberIds ?? []).includes(m.id)).length)} dự án
                    </div>
                  </div>
                  {m.id !== FOUNDER_ID ? (
                    <button onClick={() => removeMember(m.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xoá">
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'projects' ? (
          <>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Tên dự án" className={inputCls} />
                <input value={pClient} onChange={(e) => setPClient(e.target.value)} placeholder="Khách hàng (tuỳ chọn)" className={inputCls} />
                <button onClick={submitProject} className="rounded-md bg-signal px-3 text-signal-foreground hover:opacity-90" aria-label="Thêm dự án">
                  <Plus className="size-4" />
                </button>
              </div>
              <div>
                <div className={labelCls}>Gán thành viên vào dự án mới</div>
                <div className="flex flex-wrap gap-1.5">
                  {state.members.map((m) => (
                    <button key={m.id} onClick={() => togglePMember(m.id)} className={`rounded-full border px-2.5 py-1 text-[11px] transition ${pMembers.includes(m.id) ? 'border-signal/60 bg-signal/10 text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {state.projects.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có dự án. Thêm dự án thật ở trên hoặc yêu cầu Copilot tạo.</p> : null}
              {state.projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">
                      {p.name} <span className="font-mono text-[10px] text-muted-foreground">({p.id})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.client ? `${p.client} · ` : ''}
                      {p.health} · {p.progress}% · {(p.memberIds ?? []).length} thành viên: {(p.memberIds ?? []).map((id) => state.members.find((m) => m.id === id)?.name).filter(Boolean).join(', ') || 'chưa gán'}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {state.members.filter((m) => !(p.memberIds ?? []).includes(m.id)).slice(0, 6).map((m) => (
                        <button key={m.id} onClick={() => assignMemberToProject(p.id, m.id)} className="rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">+ {m.name.split(' ').slice(-1)[0]}</button>
                      ))}
                      {(p.memberIds ?? []).map((id) => {
                        const m = state.members.find((x) => x.id === id)
                        return m ? <button key={id} onClick={() => unassignMemberFromProject(p.id, id)} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-foreground" title="Bấm để bỏ khỏi dự án">{m.name.split(' ').slice(-1)[0]} ×</button> : null
                      })}
                    </div>
                  </div>
                  <button onClick={() => removeProject(p.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xoá">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'tasks' ? (
          <>
            {state.projects.length === 0 ? (
              <p className="rounded-md border border-caution/40 bg-caution/10 px-3 py-2 text-xs text-foreground">
                Cần ít nhất 1 dự án trước khi tạo task.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="Tên task" className={`${inputCls} col-span-2`} />
                <select value={tProject} onChange={(e) => setTProject(e.target.value)} className={inputCls}>
                  {state.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select value={tAssignee} onChange={(e) => setTAssignee(e.target.value)} className={inputCls}>
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <input value={tDue} onChange={(e) => setTDue(e.target.value)} type="date" className={inputCls} />
                <select value={tPriority} onChange={(e) => setTPriority(e.target.value as Priority)} className={inputCls}>
                  <option value="cao">Cao</option>
                  <option value="trung bình">Trung bình</option>
                  <option value="thấp">Thấp</option>
                </select>
                <button onClick={submitTask} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-signal px-3 py-2 text-sm font-medium text-signal-foreground hover:opacity-90">
                  <Plus className="size-4" /> Thêm task
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              {state.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border bg-background/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {state.members.find((m) => m.id === t.assigneeId)?.name ?? '?'} · {t.priority} · {t.due} · {t.status}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      value={t.status}
                      onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus })}
                      className="rounded border bg-background px-1 py-0.5 text-[11px]"
                      aria-label="Trạng thái task"
                    >
                      <option value="todo">todo</option>
                      <option value="in-progress">in-progress</option>
                      <option value="blocked">blocked</option>
                      <option value="done">done</option>
                    </select>
                    <button onClick={() => removeTask(t.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xoá">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'decisions' ? (
          <>
            <div className="space-y-2">
              <input value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="Quyết định cần duyệt" className={inputCls} />
              <textarea value={dContext} onChange={(e) => setDContext(e.target.value)} placeholder="Bối cảnh" rows={2} className={inputCls} />
              <button onClick={submitDecision} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-signal px-3 py-2 text-sm font-medium text-signal-foreground hover:opacity-90">
                <Plus className="size-4" /> Thêm quyết định
              </button>
            </div>
            <div className="space-y-1.5">
              {state.decisions.map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-2 rounded-md border bg-background/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px]">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.context}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{d.status}</div>
                  </div>
                  <button onClick={() => removeDecision(d.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xoá">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="border-t px-4 py-2.5">
        <SectionLabel>Copilot có thể tạo, sửa, gán và sắp xếp toàn bộ dữ liệu này qua chat</SectionLabel>
      </div>
    </div>
  )
}

function UsersAdmin() {
  const { user } = useWorkOS()
  const [users, setUsers] = useState<{ id: string; email: string; name: string; role: string }[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>('member')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = (await res.json()) as { users: typeof users }
        setUsers(data.users)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { void load() }, [load])

  if (user?.role !== 'admin') return null

  async function createAccount() {
    setMsg(null)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, password }),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) { setMsg(data.error ?? 'Tạo tài khoản thất bại'); return }
    setEmail(''); setName(''); setPassword('')
    setMsg('Đã tạo tài khoản. Người dùng có thể đăng nhập ngay.')
    void load()
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold text-zinc-100">Tài khoản & phân quyền</h3>
        <p className="text-xs text-zinc-500">Admin: toàn quyền, xem/sửa lương. Manager: sửa việc & dự án, không thấy lương. Member: chỉ xem.</p>
      </div>
      <div className="space-y-1.5">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-xs ring-1 ring-zinc-800">
            <span className="min-w-0 truncate text-zinc-200">{u.name} <span className="text-zinc-500">· {u.email}</span></span>
            <span className="ml-2 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 font-medium text-zinc-200 ring-1 ring-zinc-700">{u.role}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ tên" className={inputCls} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email đăng nhập" className={inputCls} />
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputCls}>
          <option value="member">Member — chỉ xem</option>
          <option value="manager">Manager — sửa việc/dự án</option>
          <option value="admin">Admin — toàn quyền</option>
        </select>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" type="password" className={inputCls} />
      </div>
      {msg ? <p className="text-xs text-zinc-400">{msg}</p> : null}
      <button onClick={() => void createAccount()} disabled={!email || !name || !password} className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-40">Tạo tài khoản</button>
    </section>
  )
}

function DesignEditor() {
  const { ui, setUI } = useWorkOS()
  const design = ui.design ?? {}
  const [css, setCss] = useState(design.customCss ?? '')

  function patchDesign(patch: Record<string, unknown>) {
    setUI({ design: { ...design, ...patch } })
  }

  const colorFields: { key: 'accentHex' | 'backgroundHex' | 'surfaceHex' | 'textHex' | 'sidebarHex'; label: string; placeholder: string }[] = [
    { key: 'accentHex', label: 'Màu nhấn (hex)', placeholder: '#FF6B35' },
    { key: 'backgroundHex', label: 'Màu nền (hex)', placeholder: '#0F172A' },
    { key: 'surfaceHex', label: 'Màu thẻ (hex)', placeholder: '#1E293B' },
    { key: 'textHex', label: 'Màu chữ (hex)', placeholder: '#F8FAFC' },
    { key: 'sidebarHex', label: 'Màu sidebar (hex)', placeholder: '#111827' },
  ]

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div>
        <div className="text-[13px] font-semibold text-zinc-100">Thiết kế tự do</div>
        <p className="text-xs text-zinc-500">Không giới hạn preset: nhập màu hex bất kỳ, kéo kích thước, hoặc dán CSS riêng. Prompt cũng sửa được các giá trị này.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {colorFields.map((f) => (
          <div key={f.key}>
            <div className={labelCls}>{f.label}</div>
            <div className="flex items-center gap-1.5">
              <input type="color" value={design[f.key] ?? '#3B82F6'} onChange={(e) => patchDesign({ [f.key]: e.target.value })} className="h-8 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5" aria-label={f.label} />
              <input defaultValue={design[f.key] ?? ''} key={design[f.key] ?? ''} onBlur={(e) => patchDesign({ [f.key]: e.target.value.trim() || undefined })} placeholder={f.placeholder} className={inputCls} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className={labelCls}>Bo góc: {design.radiusPx ?? 8}px</div>
          <input type="range" min={0} max={28} step={1} value={design.radiusPx ?? 8} onChange={(e) => patchDesign({ radiusPx: Number(e.target.value) })} className="w-full accent-zinc-100" />
        </div>
        <div>
          <div className={labelCls}>Cỡ chữ: {Math.round((design.fontScale ?? 1) * 100)}%</div>
          <input type="range" min={0.85} max={1.2} step={0.05} value={design.fontScale ?? 1} onChange={(e) => patchDesign({ fontScale: Number(e.target.value) })} className="w-full accent-zinc-100" />
        </div>
        <div>
          <div className={labelCls}>Rộng sidebar: {design.sidebarWidthPx ?? 240}px</div>
          <input type="range" min={200} max={340} step={4} value={design.sidebarWidthPx ?? 240} onChange={(e) => patchDesign({ sidebarWidthPx: Number(e.target.value) })} className="w-full accent-zinc-100" />
        </div>
        <div>
          <div className={labelCls}>Rộng nội dung: {design.contentMaxWidthPx ? `${design.contentMaxWidthPx}px` : 'mặc định'}</div>
          <input type="range" min={900} max={1600} step={20} value={design.contentMaxWidthPx ?? 1024} onChange={(e) => patchDesign({ contentMaxWidthPx: Number(e.target.value) })} className="w-full accent-zinc-100" />
        </div>
      </div>
      <div>
        <div className={labelCls}>CSS tuỳ chỉnh (áp dụng toàn app)</div>
        <textarea value={css} onChange={(e) => setCss(e.target.value)} rows={4} placeholder={'Ví dụ:\nmain h1 { letter-spacing: -0.02em; }\naside nav button { border-radius: 999px; }'} className={`${inputCls} font-mono text-[11px] leading-relaxed`} />
        <div className="mt-1.5 flex gap-1.5">
          <button onClick={() => patchDesign({ customCss: css.trim() || undefined })} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-white">Áp dụng CSS</button>
          <button onClick={() => { setCss(''); setUI({ design: {} }) }} className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-zinc-700 transition hover:text-zinc-100">Đặt lại thiết kế tự do</button>
        </div>
      </div>
    </div>
  )
}
