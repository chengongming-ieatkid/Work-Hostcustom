'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildSeed, FOUNDER_ID } from './seed'
import type { AccentColor, AuditEntry, Decision, Member, Plan, Project, Task, TaskAttachment, UIPrefs, WorkState } from './types'
import { DEFAULT_FEATURES, DEFAULT_UI } from './types'

export type Role = 'admin' | 'manager' | 'member'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  memberId?: string
}

interface WorkOSApi {
  state: WorkState
  ui: UIPrefs
  user: SessionUser | null
  authReady: boolean
  canWrite: boolean
  canFinance: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  setUI: (patch: Partial<UIPrefs>) => void
  reorderProjects: (orderedIds: string[]) => void
  applyPlan: (plan: Plan) => void
  rejectPlan: (plan: Plan) => void
  resolveDecision: (id: string, approved: boolean) => void
  addMember: (m: Omit<Member, 'id'>) => void
  updateMember: (id: string, patch: Partial<Member>) => void
  removeMember: (id: string) => void
  assignMemberToProject: (projectId: string, memberId: string) => void
  unassignMemberFromProject: (projectId: string, memberId: string) => void
  addProject: (p: Omit<Project, 'id'>) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  removeProject: (id: string) => void
  addTask: (t: Omit<Task, 'id'>) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  addTaskAttachments: (taskId: string, files: TaskAttachment[]) => void
  removeTaskAttachment: (taskId: string, attachmentId: string) => void
  addDecision: (d: Omit<Decision, 'id' | 'status'>) => void
  removeDecision: (id: string) => void
  resetAll: () => void
}

const WorkOSContext = createContext<WorkOSApi | null>(null)

function auditFromPlan(plan: Plan, result: AuditEntry['result']): AuditEntry {
  return {
    id: `a-${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    actor: 'Founder',
    prompt: plan.mode === 'executive' ? 'Phân tích tình hình toàn công ty' : 'Yêu cầu qua Work Copilot',
    planTitle: plan.title,
    actions: plan.actions.map((a) => `[L${a.level}] ${a.summary}`),
    result,
  }
}

function normalizeState(parsed: WorkState): WorkState {
  return {
    members: parsed.members ?? [],
    projects: (parsed.projects ?? []).map((p) => ({ ...p, memberIds: p.memberIds ?? [] })),
    tasks: (parsed.tasks ?? []).map((t) => ({ ...t, attachments: t.attachments ?? [] })),
    decisions: parsed.decisions ?? [],
    audit: parsed.audit ?? [],
    personalViews: parsed.personalViews ?? [],
  }
}

function normalizeUI(parsed: Partial<UIPrefs>): UIPrefs {
  const ui: UIPrefs = {
    ...DEFAULT_UI,
    ...parsed,
    features: { ...DEFAULT_FEATURES, ...(parsed.features ?? {}) },
    sections: parsed.sections ?? [],
    design: parsed.design ?? {},
  }
  // One-time migration: legacy accent palette (blue/violet/emerald) predates the
  // natural Paper/Stone/Sage/Forest/Ink identity — adopt it, including light theme,
  // and drop stale freeform design overrides (old hex tokens / custom CSS) that
  // would fight the new theme system.
  const legacyAccent = { blue: 'sage', violet: 'sage', emerald: 'forest' } as const
  if ((legacyAccent as Record<string, AccentColor>)[ui.accent]) {
    ui.accent = legacyAccent[ui.accent as keyof typeof legacyAccent]
    ui.theme = 'light'
    ui.design = {}
  }
  // Theme-system v2 (Paper/Sage redesign): clear pre-redesign freeform overrides once.
  if (ui.design.version !== 2) {
    ui.design = { version: 2 }
  }
  return ui
}

// Recompute each member's load from their open tasks (priority weight: cao=3, tb=2, thấp=1)
function recomputeLoads(tasks: Task[], members: Member[]): Member[] {
  return members.map((m) => {
    const open = tasks.filter((t) => t.assigneeId === m.id && t.status !== 'done')
    const weight = open.reduce((sum, t) => sum + (t.priority === 'cao' ? 3 : t.priority === 'trung bình' ? 2 : 1), 0)
    return { ...m, load: Math.min(weight, m.capacity) }
  })
}

const HEALTHS_OK = ['on-track', 'risk', 'delayed'] as const
function safeHealth(v: unknown): Project['health'] {
  return HEALTHS_OK.includes(v as Project['health']) ? (v as Project['health']) : 'on-track'
}

// Auto-calc project progress from tasks: done/total. Projects without tasks keep manual value.
function recomputeProgress(projects: Project[], tasks: Task[]): Project[] {
  return projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id)
    if (pt.length === 0) return p
    const done = pt.filter((t) => t.status === 'done').length
    return { ...p, progress: Math.round((done / pt.length) * 100) }
  })
}



export function WorkOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkState>(buildSeed)
  const [ui, setUiState] = useState<UIPrefs>(DEFAULT_UI)
  const [hydrated, setHydrated] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const loadFromDb = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (res.status === 401) {
        setUser(null)
        return false
      }
      if (!res.ok) return false
      const data = (await res.json()) as { state: WorkState; ui: Partial<UIPrefs>; user: SessionUser }
      setState(normalizeState(data.state))
      setUiState(normalizeUI(data.ui ?? {}))
      setUser(data.user)
      return true
    } catch {
      return false
    } finally {
      setHydrated(true)
      setAuthReady(true)
    }
  }, [])

  useEffect(() => {
    void loadFromDb()
  }, [loadFromDb])

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; user?: SessionUser }
        if (!res.ok) return data.error ?? 'Đăng nhập thất bại'
        setUser(data.user ?? null)
        await loadFromDb()
        return null
      } catch {
        return 'Không kết nối được máy chủ'
      }
    },
    [loadFromDb],
  )

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    setUser(null)
    setState(buildSeed())
    setUiState(DEFAULT_UI)
  }, [])

  const setUI = useCallback((patch: Partial<UIPrefs>) => {
    setUiState((u) => ({ ...u, ...patch }))
  }, [])

  const reorderProjects = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const byId = new Map(s.projects.map((p) => [p.id, p]))
      const ordered: Project[] = []
      orderedIds.forEach((id, i) => {
        const p = byId.get(id)
        if (p) ordered.push({ ...p, order: i })
      })
      const rest = s.projects.filter((p) => !orderedIds.includes(p.id))
      return { ...s, projects: [...ordered, ...rest] }
    })
  }, [])

  // Persist to DB (debounced). Server enforces role permissions and salary redaction.
  useEffect(() => {
    if (!hydrated || !user) return
    const timer = setTimeout(() => {
      void fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, ui }),
      }).catch(() => {
        /* offline: keep local state, next change retries */
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [state, ui, hydrated, user])

  const applyPlan = useCallback((plan: Plan) => {
    setState((s) => {
      let tasks = [...s.tasks]
      let membersRaw = [...s.members]
      let decisionsRaw = [...s.decisions]
      const projectsRaw = [...s.projects]
      const personalViews = [...s.personalViews]

      for (const action of plan.actions) {
        const p = action.payload ?? {}
        switch (action.type) {
          case 'create_project': {
            projectsRaw.push({
              id: `p-${crypto.randomUUID().slice(0, 8)}`,
              name: String(p.name ?? 'Dự án mới'),
              client: p.client ? String(p.client) : undefined,
              description: p.description ? String(p.description) : undefined,
              memberIds: Array.isArray(p.memberIds) ? (p.memberIds as string[]) : [],
              health: safeHealth(p.health),
              progress: p.progress !== undefined ? Math.max(0, Math.min(100, Number(p.progress))) : 0,
              contractValue: p.contractValue !== undefined ? Math.max(0, Number(p.contractValue)) : undefined,
              paidAmount: p.paidAmount !== undefined ? Math.max(0, Number(p.paidAmount)) : undefined,
              paymentDue: p.paymentDue ? String(p.paymentDue) : undefined,
              paymentNote: p.paymentNote ? String(p.paymentNote) : undefined,
            })
            break
          }
          case 'create_task': {
            tasks.push({
              id: `t-${crypto.randomUUID().slice(0, 8)}`,
              title: String(p.title ?? 'Task mới'),
              description: p.description ? String(p.description) : undefined,
              projectId: String(p.projectId ?? projectsRaw[0]?.id ?? ''),
              assigneeId: String(p.assigneeId ?? FOUNDER_ID),
              due: String(p.due ?? new Date().toISOString().slice(0, 10)),
              priority: (p.priority as 'cao' | 'trung bình' | 'thấp') ?? 'trung bình',
              status: (p.status as Task['status']) ?? 'todo',
              attachments: Array.isArray(p.attachments) ? (p.attachments as Task['attachments']) : [],
            })
            break
          }
          case 'reassign': {
            const idx = tasks.findIndex((t) => t.id === p.taskId)
            if (idx >= 0) tasks[idx] = { ...tasks[idx], assigneeId: String(p.toMemberId) }
            break
          }
          case 'set_priority': {
            const idx = tasks.findIndex((t) => t.id === p.taskId)
            if (idx >= 0) tasks[idx] = { ...tasks[idx], priority: p.priority as 'cao' | 'trung bình' | 'thấp' }
            break
          }
          case 'set_deadline': {
            const idx = tasks.findIndex((t) => t.id === p.taskId)
            if (idx >= 0) tasks[idx] = { ...tasks[idx], due: String(p.due) }
            break
          }
          case 'create_member': {
            membersRaw.push({
              id: `m-${crypto.randomUUID().slice(0, 8)}`,
              name: String(p.name ?? 'Thành viên mới'),
              role: String(p.role ?? 'Thành viên'),
              capacity: p.capacity !== undefined ? Math.max(1, Number(p.capacity)) : 8,
              load: 0,
              salary: p.salary !== undefined ? Math.max(0, Number(p.salary)) : undefined,
              bonus: p.bonus !== undefined ? Math.max(0, Number(p.bonus)) : undefined,
              bankName: p.bankName ? String(p.bankName) : undefined,
              bankAccount: p.bankAccount ? String(p.bankAccount) : undefined,
              payStatus: p.payStatus === 'paid' ? 'paid' : 'unpaid',
              idNumber: p.idNumber ? String(p.idNumber) : undefined,
              payDate: p.payDate ? String(p.payDate) : undefined,
              payItems: [],
            })
            break
          }
          case 'update_member': {
            const idx = membersRaw.findIndex((m) => m.id === p.memberId)
            if (idx >= 0) {
              const patch: Partial<Member> = {}
              if (p.name) patch.name = String(p.name)
              if (p.role) patch.role = String(p.role)
              if (p.capacity !== undefined) patch.capacity = Math.max(1, Number(p.capacity))
              if (p.salary !== undefined) patch.salary = Math.max(0, Number(p.salary))
              if (p.bonus !== undefined) patch.bonus = Math.max(0, Number(p.bonus))
              if (p.bankName !== undefined) patch.bankName = p.bankName ? String(p.bankName) : undefined
              if (p.bankAccount !== undefined) patch.bankAccount = p.bankAccount ? String(p.bankAccount) : undefined
              if (p.payStatus) patch.payStatus = p.payStatus === 'paid' ? 'paid' : 'unpaid'
              if (p.payNote !== undefined) patch.payNote = p.payNote ? String(p.payNote) : undefined
              if (p.idNumber !== undefined) patch.idNumber = p.idNumber ? String(p.idNumber) : undefined
              if (p.idCardImage !== undefined) patch.idCardImage = p.idCardImage ? String(p.idCardImage) : undefined
              if (p.idCardName !== undefined) patch.idCardName = p.idCardName ? String(p.idCardName) : undefined
              if (p.payDate !== undefined) patch.payDate = p.payDate ? String(p.payDate) : undefined
              membersRaw[idx] = { ...membersRaw[idx], ...patch }
            }
            break
          }
          case 'delete_member': {
            const memberId = String(p.memberId ?? '')
            if (memberId && memberId !== FOUNDER_ID) {
              membersRaw = membersRaw.filter((m) => m.id !== memberId)
              tasks = tasks.filter((t) => t.assigneeId !== memberId)
              projectsRaw.forEach((pr) => {
                pr.memberIds = (pr.memberIds ?? []).filter((id) => id !== memberId)
              })
            }
            break
          }
          case 'assign_member': {
            const idx = projectsRaw.findIndex((pr) => pr.id === p.projectId)
            const memberId = String(p.memberId ?? '')
            if (idx >= 0 && memberId && membersRaw.some((m) => m.id === memberId)) {
              const cur = projectsRaw[idx].memberIds ?? []
              if (!cur.includes(memberId)) projectsRaw[idx] = { ...projectsRaw[idx], memberIds: [...cur, memberId] }
            }
            break
          }
          case 'unassign_member': {
            const idx = projectsRaw.findIndex((pr) => pr.id === p.projectId)
            const memberId = String(p.memberId ?? '')
            if (idx >= 0) {
              projectsRaw[idx] = { ...projectsRaw[idx], memberIds: (projectsRaw[idx].memberIds ?? []).filter((id) => id !== memberId) }
            }
            break
          }
          case 'create_decision': {
            decisionsRaw.push({
              id: `d-${crypto.randomUUID().slice(0, 8)}`,
              title: String(p.title ?? 'Quyết định mới'),
              context: String(p.context ?? ''),
              status: 'pending',
            })
            break
          }
          case 'resolve_decision': {
            const idx = decisionsRaw.findIndex((d) => d.id === p.decisionId)
            if (idx >= 0) decisionsRaw[idx] = { ...decisionsRaw[idx], status: p.approved ? 'approved' : 'rejected' }
            break
          }
          case 'update_project': {
            const idx = projectsRaw.findIndex((pr) => pr.id === p.projectId)
            if (idx >= 0) {
              const patch: Partial<Project> = {}
              if (p.name) patch.name = String(p.name)
              if (p.client !== undefined) patch.client = p.client ? String(p.client) : undefined
              if (p.health) patch.health = safeHealth(p.health)
              if (p.description !== undefined) patch.description = p.description ? String(p.description) : undefined
              if (Array.isArray(p.memberIds)) patch.memberIds = p.memberIds as string[]
              if (p.contractValue !== undefined) patch.contractValue = Math.max(0, Number(p.contractValue))
              if (p.paidAmount !== undefined) patch.paidAmount = Math.max(0, Number(p.paidAmount))
              if (p.paymentDue !== undefined) patch.paymentDue = p.paymentDue ? String(p.paymentDue) : undefined
              if (p.paymentNote !== undefined) patch.paymentNote = p.paymentNote ? String(p.paymentNote) : undefined
              if (p.progress !== undefined) patch.progress = Math.max(0, Math.min(100, Number(p.progress)))
              projectsRaw[idx] = { ...projectsRaw[idx], ...patch }
            }
            break
          }
          case 'update_task': {
            const idx = tasks.findIndex((t) => t.id === p.taskId)
            if (idx >= 0) {
              const patch: Partial<Task> = {}
              if (p.title) patch.title = String(p.title)
              if (p.description !== undefined) patch.description = p.description ? String(p.description) : undefined
              if (Array.isArray(p.attachments)) patch.attachments = p.attachments as Task['attachments']
              if (p.status) patch.status = p.status as Task['status']
              if (p.priority) patch.priority = p.priority as Task['priority']
              if (p.due) patch.due = String(p.due)
              if (p.assigneeId) patch.assigneeId = String(p.assigneeId)
              if (p.projectId) patch.projectId = String(p.projectId)
              tasks[idx] = { ...tasks[idx], ...patch }
            }
            break
          }
          case 'delete_task': {
            const idx = tasks.findIndex((t) => t.id === p.taskId)
            if (idx >= 0) tasks.splice(idx, 1)
            break
          }
          case 'delete_project': {
            const idx = projectsRaw.findIndex((pr) => pr.id === p.projectId)
            if (idx >= 0) {
              const removedId = projectsRaw[idx].id
              projectsRaw.splice(idx, 1)
              for (let i = tasks.length - 1; i >= 0; i--) {
                if (tasks[i].projectId === removedId) tasks.splice(i, 1)
              }
            }
            break
          }
          case 'reorder_projects': {
            const ids = (p.orderedIds as string[]) ?? []
            const byId = new Map(projectsRaw.map((pr) => [pr.id, pr]))
            const ordered: Project[] = []
            ids.forEach((id, i) => {
              const pr = byId.get(id)
              if (pr) ordered.push({ ...pr, order: i })
            })
            const rest = projectsRaw.filter((pr) => !ids.includes(pr.id))
            projectsRaw.splice(0, projectsRaw.length, ...ordered, ...rest)
            break
          }
          case 'set_project_finance': {
            const idx = projectsRaw.findIndex((pr) => pr.id === p.projectId)
            if (idx >= 0) {
              const patch: Partial<Project> = {}
              if (p.contractValue !== undefined) patch.contractValue = Math.max(0, Number(p.contractValue))
              if (p.paidAmount !== undefined) patch.paidAmount = Math.max(0, Number(p.paidAmount))
              if (p.paymentDue !== undefined) patch.paymentDue = p.paymentDue ? String(p.paymentDue) : undefined
              if (p.paymentNote !== undefined) patch.paymentNote = p.paymentNote ? String(p.paymentNote) : undefined
              projectsRaw[idx] = { ...projectsRaw[idx], ...patch }
            }
            break
          }
          case 'set_member_pay': {
            const idx = membersRaw.findIndex((m) => m.id === p.memberId)
            if (idx >= 0) {
              const patch: Partial<Member> = {}
              if (p.salary !== undefined) patch.salary = Math.max(0, Number(p.salary))
              if (p.bonus !== undefined) patch.bonus = Math.max(0, Number(p.bonus))
              if (p.bankName !== undefined) patch.bankName = p.bankName ? String(p.bankName) : undefined
              if (p.bankAccount !== undefined) patch.bankAccount = p.bankAccount ? String(p.bankAccount) : undefined
              if (p.payStatus) patch.payStatus = p.payStatus === 'paid' ? 'paid' : 'unpaid'
              if (p.payNote !== undefined) patch.payNote = p.payNote ? String(p.payNote) : undefined
              if (p.idNumber !== undefined) patch.idNumber = p.idNumber ? String(p.idNumber) : undefined
              if (p.idCardImage !== undefined) patch.idCardImage = p.idCardImage ? String(p.idCardImage) : undefined
              if (p.idCardName !== undefined) patch.idCardName = p.idCardName ? String(p.idCardName) : undefined
              if (p.payDate !== undefined) patch.payDate = p.payDate ? String(p.payDate) : undefined
              membersRaw[idx] = { ...membersRaw[idx], ...patch }
            }
            break
          }
          case 'add_pay_item': {
            const idx = membersRaw.findIndex((m) => m.id === p.memberId)
            if (idx >= 0) {
              const item = {
                id: `pay-${crypto.randomUUID().slice(0, 8)}`,
                title: String(p.title ?? 'Khoản chi trả'),
                projectId: p.projectId ? String(p.projectId) : undefined,
                amount: p.amount !== undefined ? Math.max(0, Number(p.amount)) : 0,
                deadline: String(p.deadline ?? new Date().toISOString().slice(0, 10)),
                status: (p.status === 'paid' ? 'paid' : 'pending') as 'pending' | 'paid',
                note: p.note ? String(p.note) : undefined,
              }
              membersRaw[idx] = { ...membersRaw[idx], payItems: [...(membersRaw[idx].payItems ?? []), item] }
            }
            break
          }
          case 'update_pay_item': {
            const idx = membersRaw.findIndex((m) => m.id === p.memberId)
            if (idx >= 0) {
              const items = [...(membersRaw[idx].payItems ?? [])]
              const ii = items.findIndex((x) => x.id === p.payItemId)
              if (ii >= 0) {
                const patch: Partial<(typeof items)[number]> = {}
                if (p.title) patch.title = String(p.title)
                if (p.amount !== undefined) patch.amount = Math.max(0, Number(p.amount))
                if (p.deadline) patch.deadline = String(p.deadline)
                if (p.status) patch.status = p.status === 'paid' ? 'paid' : 'pending'
                if (p.projectId !== undefined) patch.projectId = p.projectId ? String(p.projectId) : undefined
                if (p.note !== undefined) patch.note = p.note ? String(p.note) : undefined
                items[ii] = { ...items[ii], ...patch }
                membersRaw[idx] = { ...membersRaw[idx], payItems: items }
              }
            }
            break
          }
          case 'delete_pay_item': {
            const idx = membersRaw.findIndex((m) => m.id === p.memberId)
            if (idx >= 0) {
              membersRaw[idx] = { ...membersRaw[idx], payItems: (membersRaw[idx].payItems ?? []).filter((x) => x.id !== p.payItemId) }
            }
            break
          }
          case 'set_ui': {
            // UI changes are applied via setUI after plan approval (handled in panel)
            break
          }
          case 'create_view': {
            personalViews.push({
              id: `v-${crypto.randomUUID().slice(0, 8)}`,
              title: String(p.title ?? 'Danh sách cá nhân'),
              taskIds: (p.taskIds as string[]) ?? [],
            })
            break
          }
          case 'note':
            break
        }
      }

      const members = recomputeLoads(tasks, membersRaw)
      const projects = recomputeProgress(projectsRaw, tasks)

      return {
        ...s,
        tasks,
        members,
        projects,
        decisions: decisionsRaw,
        personalViews,
        audit: [auditFromPlan(plan, 'executed'), ...s.audit],
      }
    })
  }, [])

  const rejectPlan = useCallback((plan: Plan) => {
    setState((s) => ({ ...s, audit: [auditFromPlan(plan, 'rejected'), ...s.audit] }))
  }, [])

  const resolveDecision = useCallback((id: string, approved: boolean) => {
    setState((s) => ({
      ...s,
      decisions: s.decisions.map((d: Decision) => (d.id === id ? { ...d, status: approved ? 'approved' : 'rejected' } : d)),
    }))
  }, [])

  const addMember = useCallback((m: Omit<Member, 'id'>) => {
    setState((s) => ({ ...s, members: [...s.members, { ...m, id: `m-${crypto.randomUUID().slice(0, 8)}` }] }))
  }, [])

  const removeMember = useCallback((id: string) => {
    setState((s) => {
      if (id === FOUNDER_ID) return s
      const tasks = s.tasks.filter((t) => t.assigneeId !== id)
      const projects = s.projects.map((p) => ({ ...p, memberIds: (p.memberIds ?? []).filter((mid) => mid !== id) }))
      return { ...s, members: s.members.filter((m) => m.id !== id), tasks, projects }
    })
  }, [])

  const updateMember = useCallback((id: string, patch: Partial<Member>) => {
    setState((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
  }, [])

  const assignMemberToProject = useCallback((projectId: string, memberId: string) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p
        const cur = p.memberIds ?? []
        return cur.includes(memberId) ? p : { ...p, memberIds: [...cur, memberId] }
      }),
    }))
  }, [])

  const unassignMemberFromProject = useCallback((projectId: string, memberId: string) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, memberIds: (p.memberIds ?? []).filter((id) => id !== memberId) } : p)),
    }))
  }, [])

  const addProject = useCallback((p: Omit<Project, 'id'>) => {
    setState((s) => ({ ...s, projects: [...s.projects, { ...p, memberIds: p.memberIds ?? [], id: `p-${crypto.randomUUID().slice(0, 8)}` }] }))
  }, [])

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }, [])

  const removeProject = useCallback((id: string) => {
    setState((s) => {
      const tasks = s.tasks.filter((t) => t.projectId !== id)
      return { ...s, projects: s.projects.filter((p) => p.id !== id), tasks }
    })
  }, [])

  const addTask = useCallback((t: Omit<Task, 'id'>) => {
    setState((s) => {
      const tasks = [...s.tasks, { ...t, id: `t-${crypto.randomUUID().slice(0, 8)}` }]
      return { ...s, tasks, members: recomputeLoads(tasks, s.members), projects: recomputeProgress(s.projects, tasks) }
    })
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => {
      const tasks = s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
      return { ...s, tasks, members: recomputeLoads(tasks, s.members), projects: recomputeProgress(s.projects, tasks) }
    })
  }, [])

  const removeTask = useCallback((id: string) => {
    setState((s) => {
      const tasks = s.tasks.filter((t) => t.id !== id)
      return { ...s, tasks, members: recomputeLoads(tasks, s.members), projects: recomputeProgress(s.projects, tasks) }
    })
  }, [])

  const addTaskAttachments = useCallback((taskId: string, files: TaskAttachment[]) => {
    if (files.length === 0) return
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, attachments: [...(t.attachments ?? []), ...files] } : t)),
    }))
  }, [])

  const removeTaskAttachment = useCallback((taskId: string, attachmentId: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, attachments: (t.attachments ?? []).filter((a) => a.id !== attachmentId) } : t)),
    }))
  }, [])

  const addDecision = useCallback((d: Omit<Decision, 'id' | 'status'>) => {
    setState((s) => ({ ...s, decisions: [...s.decisions, { ...d, id: `d-${crypto.randomUUID().slice(0, 8)}`, status: 'pending' as const }] }))
  }, [])

  const removeDecision = useCallback((id: string) => {
    setState((s) => ({ ...s, decisions: s.decisions.filter((d) => d.id !== id) }))
  }, [])

  const resetAll = useCallback(() => {
    void (async () => {
      try {
        const res = await fetch('/api/state', { method: 'DELETE' })
        if (res.ok) {
          const data = (await res.json()) as { state: WorkState; ui: Partial<UIPrefs> }
          setState(normalizeState(data.state))
          setUiState(normalizeUI(data.ui ?? {}))
          return
        }
      } catch {
        /* fall through to local reset */
      }
      setState(buildSeed())
      setUiState(DEFAULT_UI)
    })()
  }, [])

  const canWrite = user?.role === 'admin' || user?.role === 'manager'
  const canFinance = user?.role === 'admin'

  const api = useMemo<WorkOSApi>(
    () => ({
      state,
      ui,
      user,
      authReady,
      canWrite,
      canFinance,
      login,
      logout,
      setUI,
      reorderProjects,
      applyPlan,
      rejectPlan,
      resolveDecision,
      addMember,
      updateMember,
      removeMember,
      assignMemberToProject,
      unassignMemberFromProject,
      addProject,
      updateProject,
      removeProject,
      addTask,
      updateTask,
      removeTask,
      addTaskAttachments,
      removeTaskAttachment,
      addDecision,
      removeDecision,
      resetAll,
    }),
    [state, ui, user, authReady, canWrite, canFinance, login, logout, setUI, reorderProjects, applyPlan, rejectPlan, resolveDecision, addMember, updateMember, removeMember, assignMemberToProject, unassignMemberFromProject, addProject, updateProject, removeProject, addTask, updateTask, removeTask, addTaskAttachments, removeTaskAttachment, addDecision, removeDecision, resetAll],
  )

  return <WorkOSContext.Provider value={api}>{children}</WorkOSContext.Provider>
}

export function useWorkOS(): WorkOSApi {
  const ctx = useContext(WorkOSContext)
  if (!ctx) throw new Error('useWorkOS must be used inside WorkOSProvider')
  return ctx
}
