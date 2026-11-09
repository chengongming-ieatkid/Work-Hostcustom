'use client'

import { useState } from 'react'
import { Bot, Settings, Database, X } from 'lucide-react'
import { WorkOSProvider, useWorkOS } from '@/lib/store'
import type { ViewKey } from '@/lib/types'
import { Sidebar } from '@/components/sidebar'
import { CopilotPanel } from '@/components/copilot/copilot-panel'
import { AIProviderPanel } from '@/components/ai-provider-panel'
import { DataManager } from '@/components/data-manager'
import { MyWork } from '@/components/views/my-work'
import { CompanyDashboard } from '@/components/views/company-dashboard'
import { Projects } from '@/components/views/projects'
import { ProjectDetail } from '@/components/views/project-detail'
import { MemberManagement } from '@/components/views/member-management'
import { TeamWorkload } from '@/components/views/team-workload'
import { Activity } from '@/components/views/activity'
import { CustomSections } from '@/components/custom-sections'
import { LoginScreen } from '@/components/login-screen'
import { designToStyle, sanitizeCustomCss } from '@/lib/design'

const TITLES: Record<Exclude<ViewKey, 'copilot'>, { label: string; title: string }> = {
  'my-work': { label: 'Việc của bạn, ưu tiên theo hạn và mức độ quan trọng', title: 'My Work' },
  company: { label: 'Nhịp độ tổ chức: sức khoẻ dự án, tải việc và điểm cần quyết định', title: 'Team Pulse' },
  projects: { label: 'Toàn bộ hoạt động công việc: tiến độ, thành viên và việc đang mở', title: 'Work in Progress' },
  members: { label: 'Con người: vai trò, kỹ năng, khả năng và sự kết nối', title: 'People' },
  workload: { label: 'Ai đang quá tải, ai còn khả năng nhận việc', title: 'Team Workload' },
  activity: { label: 'Quyết định chờ duyệt và nhật ký thay đổi của hệ thống', title: 'Activity & Decisions' },
}

function FeatureOff({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
      <p className="text-sm font-medium text-zinc-200">Tính năng {name} đang tắt</p>
      <p className="mt-1 text-[13px] text-zinc-500">Nói với Copilot: “Bật lại {name}” để mở lại mà không cần sửa code.</p>
    </div>
  )
}

function Shell() {
  const { ui, setUI, user, authReady } = useWorkOS()
  const [view, setView] = useState<ViewKey>('copilot')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showData, setShowData] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!authReady) {
    return <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-sm text-zinc-500">Đang tải dữ liệu từ máy chủ…</div>
  }
  if (!user) return <LoginScreen />

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground" style={designToStyle(ui.design ?? {})} data-theme={ui.theme} data-accent={ui.accent} data-density={ui.density}>
      {ui.design?.customCss ? <style>{sanitizeCustomCss(ui.design.customCss)}</style> : null}
      <Sidebar view={view} onView={setView} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {view === 'copilot' ? (
          <div className="flex h-full flex-col items-center justify-center gap-10 p-8">
            <div className="max-w-md text-center lg:hidden">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-signal/15">
                <Bot className="size-7 text-signal" />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-balance">TVQ Work Copilot</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Mở Copilot để giao việc bằng ngôn ngữ tự nhiên hoặc phân tích tình hình toàn công ty.
              </p>
              <button
                onClick={() => setCopilotOpen(true)}
                className="mt-5 rounded-md bg-signal px-5 py-2.5 text-sm font-medium text-signal-foreground transition-opacity hover:opacity-90"
              >
                Push the Frontier
              </button>
            </div>

            <div className="hidden max-w-xl lg:block">
              <div className="os-label">The Self-Adaptive AI Workspace</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{ui.homeHeadline}</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Nền tảng AI-native nơi AI hiểu con người, công việc và tổ chức — tự điều chỉnh không gian làm việc theo nhu cầu của bạn. Technology serves people.
              </p>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-signal" />Human-centered AI</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-signal" />Adaptive Workspace</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-signal" />Work-Life Balance</span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 text-left">
                  <div className="text-[13px] font-semibold text-zinc-100">People</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Hiểu con người: hồ sơ, vai trò, kỹ năng, khối lượng công việc và sự phối hợp giữa các thành viên.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-left">
                  <div className="text-[13px] font-semibold text-zinc-100">Work in Progress</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Projects, tasks, timeline — giao việc, theo dõi trạng thái và phát hiện điểm nghẽn.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-left">
                  <div className="text-[13px] font-semibold text-zinc-100">Team Pulse</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Nhịp độ tổ chức: workload, project health, hoạt động nhóm và đề xuất điều chỉnh nguồn lực.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-left">
                  <div className="text-[13px] font-semibold text-zinc-100">AI Copilot</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Ra lệnh bằng ngôn ngữ tự nhiên — AI tạo dashboard, phân công, thực thi workflow trong phạm vi được cấp quyền.
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border bg-card p-4 text-left">
                <div className="text-[13px] font-semibold text-zinc-100">Mức độ kiểm soát</div>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  <li><span className="font-semibold text-emerald-300">L1</span> — xem, tóm tắt, mở màn hình: thực hiện ngay.</li>
                  <li><span className="font-semibold text-zinc-100">L2</span> — tạo nhân viên, dự án, task, gán người, đổi giao diện: chạy ngay khi bật Thực thi trực tiếp.</li>
                  <li><span className="font-semibold text-amber-300">L3</span> — xoá, đổi người phụ trách, đổi hạn: luôn chờ bạn duyệt.</li>
                </ul>
              </div>

              <CustomSections view="home" />

              {/* AWS Config + Data Manager Buttons */}
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Settings className="size-4" />
                  Cấu hình AI Provider
                </button>
                <button
                  onClick={() => setShowData(!showData)}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Database className="size-4" />
                  Quản lý dữ liệu thật
                </button>
              </div>
              {showConfig && (
                <div className="mt-3">
                  <AIProviderPanel />
                </div>
              )}
              {showData && (
                <div className="mt-3">
                  <DataManager />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full px-6 py-7 md:px-8" style={{ maxWidth: ui.design?.contentMaxWidthPx ? ui.design.contentMaxWidthPx : '64rem' }}>
            <header className="mb-7">
              <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50">{TITLES[view].title}</h1>
              <p className="mt-1 text-[13px] text-zinc-500">{TITLES[view].label}</p>
            </header>
            {view === 'my-work' && (ui.features.myWork ? <MyWork /> : <FeatureOff name="My Work" />)}
            {view === 'company' && (ui.features.company ? <CompanyDashboard /> : <FeatureOff name="Company Dashboard" />)}
            {view === 'projects' && (ui.features.projects ? (
              <>
                <Projects onProjectClick={(id) => setSelectedProjectId(id)} />
                {selectedProjectId && <ProjectDetail projectId={selectedProjectId} onClose={() => setSelectedProjectId(null)} />}
              </>
            ) : <FeatureOff name="Projects" />)}
            {view === 'members' && <MemberManagement />}
            {view === 'workload' && (ui.features.workload ? <TeamWorkload /> : <FeatureOff name="Team Workload" />)}
            {view === 'activity' && (ui.features.activity ? <Activity /> : <FeatureOff name="Activity & Decisions" />)}
            <CustomSections view={view} />
          </div>
        )}
      </main>

      {/* Settings overlay — accessible from any view */}
      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold">Cài đặt</div>
              <button onClick={() => setSettingsOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Đóng cài đặt">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 p-4">
              <DataManager />
              <AIProviderPanel />
            </div>
          </div>
        </div>
      ) : null}

      {/* Copilot dock — static on desktop, overlay on mobile */}
      <aside
        style={{ width: ui.showCopilot ? ui.copilotWidth : 0 }}
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-[430px] overflow-hidden border-l shadow-2xl transition-all duration-300 lg:static lg:max-w-none lg:shrink-0 lg:shadow-none ${
          copilotOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${!ui.showCopilot ? 'lg:hidden' : ''}`}
      >
        <CopilotPanel onClose={() => setCopilotOpen(false)} onNavigate={(v) => { setView(v); setCopilotOpen(false) }} />
      </aside>

      {view !== 'copilot' ? (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex size-12 items-center justify-center rounded-full bg-signal text-signal-foreground shadow-lg transition-transform hover:scale-105 lg:hidden"
          aria-label="Mở Work Copilot"
        >
          <Bot className="size-5" />
        </button>
      ) : null}
    </div>
  )
}

export default function Page() {
  return (
    <WorkOSProvider>
      <Shell />
    </WorkOSProvider>
  )
}
