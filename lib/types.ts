export type Priority = 'cao' | 'trung bình' | 'thấp'
export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done'
export type ProjectHealth = 'on-track' | 'risk' | 'delayed'

export interface PayItem {
  id: string
  title: string
  projectId?: string
  amount: number // VND
  deadline: string // ISO date — payment deadline
  status: 'pending' | 'paid'
  note?: string
}

export interface Member {
  id: string
  name: string
  role: string
  capacity: number
  load: number
  // Finance & payroll (optional, editable)
  salary?: number // monthly base salary (VND)
  bonus?: number // bonus this period (VND)
  bankName?: string
  bankAccount?: string
  payStatus?: 'unpaid' | 'paid'
  payNote?: string
  // Payroll expansion
  idNumber?: string // CCCD number
  idCardImage?: string // CCCD photo (data URL, small images only)
  idCardName?: string
  payDate?: string // regular payday (ISO date or day-of-month note)
  payItems?: PayItem[] // per-project / ad-hoc payments with deadlines
}

export interface Project {
  id: string
  name: string
  client?: string
  health: ProjectHealth
  progress: number
  order?: number
  memberIds?: string[]
  description?: string
  // Finance (optional, editable)
  contractValue?: number // total contract value (VND)
  paidAmount?: number // amount client already paid (VND)
  paymentDue?: string // next payment due date (ISO)
  paymentNote?: string
}

export interface TaskAttachment {
  id: string
  name: string
  type: string
  size: number
  addedAt: string
  // Small text/data files are stored inline so Copilot can read them; large/binary files keep metadata only.
  dataUrl?: string
  text?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  projectId: string
  assigneeId: string
  due: string // ISO date
  priority: Priority
  status: TaskStatus
  blocked?: boolean
  attachments?: TaskAttachment[]
}

export interface Decision {
  id: string
  title: string
  context: string
  status: 'pending' | 'approved' | 'rejected'
}

export type ActionLevel = 1 | 2 | 3

export type ActionType =
  | 'create_task'
  | 'create_project'
  | 'create_member'
  | 'update_member'
  | 'delete_member'
  | 'assign_member'
  | 'unassign_member'
  | 'create_decision'
  | 'resolve_decision'
  | 'reassign'
  | 'set_priority'
  | 'set_deadline'
  | 'create_view'
  | 'update_project'
  | 'update_task'
  | 'delete_task'
  | 'delete_project'
  | 'reorder_projects'
  | 'set_ui'
  | 'set_feature'
  | 'set_project_finance'
  | 'set_member_pay'
  | 'add_pay_item'
  | 'update_pay_item'
  | 'delete_pay_item'
  | 'upsert_section'
  | 'delete_section'
  | 'navigate'
  | 'show_widget'
  | 'note'

export interface PlanAction {
  id: string
  level: ActionLevel
  type: ActionType
  summary: string
  detail?: string
  payload?: Record<string, unknown>
}

export interface Plan {
  id: string
  mode: 'command' | 'executive'
  title: string
  reasoning: string[]
  actions: PlanAction[]
  impact: string[]
  status: 'pending' | 'approved' | 'rejected'
}

export interface Analysis {
  overdue: Task[]
  blocked: Task[]
  pendingDecisions: Decision[]
  overloaded: Member[]
  mustDecide: string[]
  canDelegate: { taskTitle: string; suggestTo: string; reason: string }[]
  canAuto: string[]
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  prompt: string
  planTitle: string
  actions: string[]
  result: 'executed' | 'rejected' | 'auto'
}

export interface PersonalView {
  id: string
  title: string
  taskIds: string[]
}

export interface WorkState {
  members: Member[]
  projects: Project[]
  tasks: Task[]
  decisions: Decision[]
  audit: AuditEntry[]
  personalViews: PersonalView[]
}

export type AccentColor = 'sage' | 'forest' | 'amber' | 'rose'
export type Density = 'comfortable' | 'compact'
export type ProjectLayout = 'grid' | 'list' | 'board'
export type ThemeMode = 'dark' | 'light'

export type FeatureKey = 'projects' | 'workload' | 'company' | 'activity' | 'myWork' | 'projectMembers' | 'taskAttachments' | 'progressSlider' | 'finance'

export interface CustomSection {
  id: string
  title: string
  body: string
  view: ViewKey | 'home'
  order: number
}

export interface DesignPrefs {
  /** Bump when the built-in theme system changes so stale freeform overrides get cleared once. */
  version?: number
  accentHex?: string
  backgroundHex?: string
  surfaceHex?: string
  textHex?: string
  sidebarHex?: string
  radiusPx?: number
  fontScale?: number // 0.85 - 1.2
  sidebarWidthPx?: number // 200 - 340
  contentMaxWidthPx?: number // 900 - 1600, 0/undefined = full
  customCss?: string
}

export interface UIPrefs {
  theme: ThemeMode
  accent: AccentColor
  density: Density
  projectLayout: ProjectLayout
  copilotWidth: number
  showCopilot: boolean
  autoExecute: boolean
  features: Record<FeatureKey, boolean>
  sections: CustomSection[]
  appName: string
  homeHeadline: string
  design: DesignPrefs
}

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  projects: true,
  workload: true,
  company: true,
  activity: true,
  myWork: true,
  projectMembers: true,
  taskAttachments: true,
  progressSlider: true,
  finance: true,
}

export const DEFAULT_UI: UIPrefs = {
  theme: 'light',
  accent: 'sage',
  density: 'comfortable',
  projectLayout: 'grid',
  copilotWidth: 420,
  showCopilot: true,
  autoExecute: false,
  features: DEFAULT_FEATURES,
  sections: [],
  appName: 'TVQ Work Copilot',
  homeHeadline: 'Work smarter. Live healthier. Grow together.',
  design: {},
}

export interface CopilotReply {
  text: string
  plan?: Plan
  analysis?: Analysis
  widget?: WidgetSpec
}

export type WidgetKind = 'stat' | 'table' | 'bars' | 'list'

export interface WidgetSpec {
  kind: WidgetKind
  title: string
  // stat
  value?: string
  sub?: string
  // table
  columns?: string[]
  rows?: string[][]
  // bars / list
  items?: { label: string; value: number; max?: number; hint?: string }[]
}

export type ViewKey =
  | 'copilot'
  | 'my-work'
  | 'company'
  | 'projects'
  | 'workload'
  | 'activity'
  | 'members'
