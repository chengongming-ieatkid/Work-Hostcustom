'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronDown, GripVertical, LayoutGrid, List, Columns3, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { fmtDate } from '@/lib/copilot-engine'
import { FOUNDER_ID } from '@/lib/seed'
import { useWorkOS } from '@/lib/store'
import { Bar, HealthBadge } from '@/components/ui-bits'
import { TaskAttachments } from '@/components/task-attachments'
import { cn } from '@/lib/utils'
import type { Priority, Project, ProjectHealth, ProjectLayout, Task, TaskStatus } from '@/lib/types'

const HEALTHS: ProjectHealth[] = ['on-track', 'risk', 'delayed']
const HEALTH_LABEL: Record<ProjectHealth, string> = { 'on-track': 'Đúng tiến độ', risk: 'Có rủi ro', delayed: 'Đang trễ' }
const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'Chưa làm', 'in-progress': 'Đang làm', blocked: 'Bị chặn', done: 'Hoàn thành' }
const PRIORITIES: Priority[] = ['cao', 'trung bình', 'thấp']

const LAYOUTS: { key: ProjectLayout; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'grid', label: 'Thẻ', icon: LayoutGrid },
  { key: 'list', label: 'Danh sách', icon: List },
  { key: 'board', label: 'Bảng', icon: Columns3 },
]

const inputCls = 'w-full rounded-lg bg-zinc-800/80 px-2.5 py-2 text-[13px] text-zinc-100 outline-none ring-1 ring-zinc-700/80 placeholder:text-zinc-500 focus:ring-zinc-400'
const labelCls = 'mb-1 block text-[11px] font-medium text-zinc-500'

function sortedProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

function initials(name: string) {
  return name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?'
}

export function MemberAvatars({ ids, size = 'md' }: { ids: string[]; size?: 'sm' | 'md' }) {
  const { state } = useWorkOS()
  const members = ids.map((id) => state.members.find((m) => m.id === id)).filter(Boolean)
  if (members.length === 0) return <span className="text-xs text-zinc-500">Chưa gán ai</span>
  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {members.slice(0, 5).map((m) => (
          <span key={m!.id} title={`${m!.name} · ${m!.role}`} className={cn('flex items-center justify-center rounded-full border border-zinc-900 bg-zinc-700 font-medium text-zinc-100', size === 'sm' ? 'size-6 text-[10px]' : 'size-7 text-[11px]')}>
            {initials(m!.name)}
          </span>
        ))}
      </div>
      {members.length > 5 ? <span className="ml-2 text-xs text-zinc-400">+{members.length - 5}</span> : null}
      <span className="ml-2 hidden text-xs text-zinc-400 xl:inline">{members.slice(0, 2).map((m) => m!.name.split(' ').slice(-1)[0]).join(', ')}{members.length > 2 ? '…' : ''}</span>
    </div>
  )
}

function ProjectMembersEditor({ project }: { project: Project }) {
  const { state, ui, assignMemberToProject, unassignMemberFromProject } = useWorkOS()
  const [open, setOpen] = useState(false)
  if (!ui.features.projectMembers) return null
  const assigned = project.memberIds ?? []
  const available = state.members.filter((m) => !assigned.includes(m.id))
  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {assigned.map((id) => {
          const m = state.members.find((x) => x.id === id)
          if (!m) return null
          return (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 py-1 pl-1 pr-2 text-xs text-zinc-200">
              <span className="flex size-5 items-center justify-center rounded-full bg-zinc-600 text-[9px] font-semibold">{initials(m.name)}</span>
              {m.name}
              <button onClick={() => unassignMemberFromProject(project.id, id)} className="text-zinc-500 hover:text-red-300" aria-label={`Bỏ ${m.name} khỏi dự án`}><X className="size-3" /></button>
            </span>
          )
        })}
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200">
          <UserPlus className="size-3.5" /> Thêm người
        </button>
      </div>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl">
          {available.length === 0 ? <p className="px-2 py-2 text-xs text-zinc-500">Tất cả thành viên đã ở trong dự án.</p> : available.map((m) => (
            <button key={m.id} onClick={() => assignMemberToProject(project.id, m.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-zinc-800">
              <span className="flex size-7 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold">{initials(m.name)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] text-zinc-100">{m.name}</span><span className="block truncate text-[11px] text-zinc-500">{m.role}</span></span>
              <Plus className="size-4 text-zinc-500" />
            </button>
          ))}
          <button onClick={() => setOpen(false)} className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800">Đóng</button>
        </div>
      ) : null}
    </div>
  )
}

function QuickAddTask({ project, onDone }: { project: Project; onDone?: () => void }) {
  const { state, addTask } = useWorkOS()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState(FOUNDER_ID)
  const [due, setDue] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10))
  const [priority, setPriority] = useState<Priority>('trung bình')

  function submit() {
    if (!title.trim()) return
    addTask({ title: title.trim(), description: description.trim() || undefined, projectId: project.id, assigneeId, due, priority, status: 'todo', attachments: [] })
    setTitle(''); setDescription('')
    onDone?.()
  }

  return (
    <div className="rounded-xl bg-zinc-800/50 p-3 ring-1 ring-zinc-700/70">
      <div className="grid gap-2">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} placeholder="Tên công việc, ví dụ: Thiết kế màn hình đăng nhập" className={inputCls} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả thêm (không bắt buộc) — sau khi tạo, kéo thả tài liệu vào công việc bên dưới" rows={2} className={inputCls} />
        <div className="grid grid-cols-3 gap-2">
          <div><label className={labelCls}>Người làm</label><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls}>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className={labelCls}>Hạn</label><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Ưu tiên</label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputCls}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={!title.trim()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-[13px] font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-40"><Check className="size-4" /> Thêm công việc</button>
          {onDone ? <button onClick={onDone} className="rounded-lg px-3 py-2 text-[13px] text-zinc-400 ring-1 ring-zinc-700 hover:text-zinc-100">Huỷ</button> : null}
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, defaultOpen = false }: { task: Task; defaultOpen?: boolean }) {
  const { state, ui, updateTask, removeTask } = useWorkOS()
  const [open, setOpen] = useState(defaultOpen)
  const assignee = state.members.find((m) => m.id === task.assigneeId)
  const overdue = task.status !== 'done' && new Date(task.due) < new Date(new Date().toDateString())
  return (
    <li className="rounded-xl bg-zinc-800/40 ring-1 ring-zinc-800">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <button onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })} className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 transition', task.status === 'done' ? 'bg-emerald-400 text-zinc-900 ring-emerald-300' : 'text-transparent ring-zinc-600 hover:ring-zinc-300')} aria-label="Đánh dấu hoàn thành"><Check className="size-3.5" /></button>
        <div className="min-w-0 flex-1">
          <div className={cn('text-[13px] leading-snug', task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-100')}>{task.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
            <span>{assignee?.name ?? 'Chưa gán'}</span><span aria-hidden>·</span>
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-amber-300')}><CalendarDays className="size-3" />{fmtDate(task.due)}{overdue ? ' (quá hạn)' : ''}</span><span aria-hidden>·</span>
            <span>{STATUS_LABEL[task.status]}</span>
            {(task.attachments?.length ?? 0) > 0 ? <><span aria-hidden>·</span><span>{task.attachments!.length} tài liệu</span></> : null}
          </div>
          {task.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{task.description}</p> : null}
        </div>
        <button onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Chi tiết công việc"><ChevronDown className={cn('size-4 transition', open && 'rotate-180')} /></button>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelCls}>Trạng thái</label><select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })} className={inputCls}>{(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
            <div><label className={labelCls}>Người làm</label><select value={task.assigneeId} onChange={(e) => updateTask(task.id, { assigneeId: e.target.value })} className={inputCls}>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label className={labelCls}>Hạn</label><input type="date" value={task.due} onChange={(e) => updateTask(task.id, { due: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Mô tả</label><textarea defaultValue={task.description ?? ''} onBlur={(e) => updateTask(task.id, { description: e.target.value.trim() || undefined })} rows={2} placeholder="Ghi chú, yêu cầu, link tham khảo…" className={inputCls} /></div>
          {ui.features.taskAttachments ? <TaskAttachments task={task} /> : null}
          <div className="flex justify-end"><button onClick={() => { if (confirm('Xoá công việc này?')) removeTask(task.id) }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300"><Trash2 className="size-3.5" /> Xoá công việc</button></div>
        </div>
      ) : null}
    </li>
  )
}

function ProjectTasks({ project, showDone = true }: { project: Project; showDone?: boolean }) {
  const { state } = useWorkOS()
  const [adding, setAdding] = useState(false)
  const all = state.tasks.filter((t) => t.projectId === project.id)
  const visible = showDone ? all : all.filter((t) => t.status !== 'done')
  const done = all.filter((t) => t.status === 'done').length
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-300">Công việc ({all.length}){all.length ? ` · xong ${done}` : ''}</span>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-white"><Plus className="size-3.5" /> Thêm công việc</button>
      </div>
      {adding ? <div className="mb-3"><QuickAddTask project={project} onDone={() => setAdding(false)} /></div> : null}
      {visible.length === 0 ? (
        <button onClick={() => setAdding(true)} className="w-full rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-[13px] text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300">Chưa có công việc nào — bấm để thêm việc đầu tiên, hoặc nói với Copilot.</button>
      ) : (
        <ul className="space-y-2">{visible.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
      )}
    </div>
  )
}

export function Projects({ onProjectClick }: { onProjectClick?: (id: string) => void }) {
  const { state, ui, setUI, reorderProjects } = useWorkOS()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const projects = useMemo(() => sortedProjects(state.projects), [state.projects])

  if (state.projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
        <p className="text-sm font-medium text-zinc-200">Chưa có dự án nào</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-zinc-500">Hãy nói với Copilot: “Tạo dự án App Tay Vịn và gán Minh vào dự án”, hoặc thêm trong Cài đặt & dữ liệu.</p>
      </div>
    )
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const ids = projects.map((p) => p.id)
    const from = ids.indexOf(dragId); const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(from, 1); ids.splice(to, 0, dragId)
    reorderProjects(ids); setDragId(null); setOverId(null)
  }
  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: () => setDragId(id),
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOverId(id) },
    onDrop: () => handleDrop(id),
    onDragEnd: () => { setDragId(null); setOverId(null) },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-zinc-50">Dự án</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">{projects.length} dự án · thêm việc ngay trong dự án · kéo thả tài liệu vào từng việc</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 ring-1 ring-zinc-800">
          {LAYOUTS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setUI({ projectLayout: key })} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', ui.projectLayout === key ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200')}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {ui.projectLayout === 'grid' ? (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {projects.map((p) => <ProjectCard key={p.id} project={p} dragProps={dragProps(p.id)} isDragging={dragId === p.id} isOver={overId === p.id && dragId !== p.id} onClick={onProjectClick} />)}
        </div>
      ) : null}

      {ui.projectLayout === 'list' ? (
        <div className="space-y-3">
          {projects.map((p) => (
            <section key={p.id} {...dragProps(p.id)} className={cn('rounded-2xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800', dragId === p.id && 'opacity-40', overId === p.id && dragId !== p.id && 'ring-zinc-500')}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <GripVertical className="size-4 cursor-grab text-zinc-600" />
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-zinc-50">{p.name}</div><div className="text-xs text-zinc-500">{p.client ?? 'Dự án nội bộ'}</div></div>
                <MemberAvatars ids={p.memberIds ?? []} size="sm" />
                <HealthBadge health={p.health} />
                <div className="flex w-44 items-center gap-2"><Bar value={p.progress} max={100} className="flex-1" /><span className="text-xs tabular-nums text-zinc-400">{p.progress}%</span></div>
              </div>
              <ProjectTasks project={p} />
            </section>
          ))}
        </div>
      ) : null}

      {ui.projectLayout === 'board' ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {HEALTHS.map((health) => {
            const col = projects.filter((p) => p.health === health)
            return (
              <section key={health} className="rounded-2xl bg-zinc-900/40 p-3 ring-1 ring-zinc-800/80">
                <div className="mb-3 flex items-center justify-between px-1"><span className="text-[13px] font-medium text-zinc-200">{HEALTH_LABEL[health]}</span><span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">{col.length}</span></div>
                <div className="space-y-3">
                  {col.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-600">Không có dự án</p> : null}
                  {col.map((p) => (
                    <article key={p.id} className="rounded-xl bg-zinc-900 p-3.5 ring-1 ring-zinc-800">
                      <div className="text-[13px] font-medium leading-snug text-zinc-100">{p.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{p.client ?? 'Dự án nội bộ'}</div>
                      <div className="mt-3"><MemberAvatars ids={p.memberIds ?? []} size="sm" /></div>
                      <div className="mt-3 flex items-center gap-2"><Bar value={p.progress} max={100} className="flex-1" /><span className="text-[11px] tabular-nums text-zinc-400">{p.progress}%</span></div>
                      <div className="mt-3 border-t border-zinc-800 pt-3"><ProjectTasks project={p} showDone={false} /></div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function ProjectCard({ project: p, dragProps, isDragging, isOver, onClick }: { project: Project; dragProps: Record<string, unknown>; isDragging?: boolean; isOver?: boolean; onClick?: (id: string) => void }) {
  const { state, ui, updateProject } = useWorkOS()
  const allTasks = state.tasks.filter((t) => t.projectId === p.id)
  const done = allTasks.filter((t) => t.status === 'done').length
  return (
    <article {...dragProps} onClick={() => onClick?.(p.id)} className={cn('cursor-pointer rounded-2xl bg-zinc-900/50 p-5 ring-1 ring-zinc-800 transition hover:ring-zinc-700', isDragging && 'opacity-40', isOver && 'ring-2 ring-zinc-500')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-zinc-600" />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-zinc-50">{p.name}</h3>
            <p className="mt-0.5 truncate text-[13px] text-zinc-500">{p.client ?? 'Dự án nội bộ'}{p.description ? ` · ${p.description}` : ''}</p>
          </div>
        </div>
        <select value={p.health} onChange={(e) => updateProject(p.id, { health: e.target.value as ProjectHealth })} className="shrink-0 rounded-lg bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500" aria-label="Trạng thái dự án">
          {HEALTHS.map((h) => <option key={h} value={h}>{HEALTH_LABEL[h]}</option>)}
        </select>
      </div>

      {ui.features.projectMembers ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-zinc-300">Thành viên dự án</span><span className="text-zinc-500">{(p.memberIds ?? []).length} người</span></div>
          <ProjectMembersEditor project={p} />
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-zinc-300">Tiến độ</span><span className="tabular-nums text-zinc-400">{p.progress}% · {done}/{allTasks.length} việc xong</span></div>
        <div className="flex items-center gap-3"><Bar value={p.progress} max={100} />{ui.features.progressSlider ? <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => updateProject(p.id, { progress: Number(e.target.value) })} className="h-1 w-28 shrink-0 accent-zinc-200" aria-label="Chỉnh tiến độ dự án" /> : null}</div>
        <p className="mt-1.5 text-[11px] text-zinc-600">{allTasks.length ? 'Tự cập nhật khi việc hoàn thành; vẫn có thể kéo để chỉnh tay.' : 'Chưa có việc nào — thêm việc bên dưới để bắt đầu theo dõi.'}</p>
      </div>

      <div className="mt-5 border-t border-zinc-800/80 pt-4"><ProjectTasks project={p} /></div>
    </article>
  )
}
