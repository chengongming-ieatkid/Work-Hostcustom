'use client'

import { useState } from 'react'
import { X, ChevronRight, UserPlus, Calendar, Flag, FileText, MoreVertical, Edit2, UserCheck } from 'lucide-react'
import { useWorkOS } from '@/lib/store'
import type { Project, Task, Member, Priority, TaskStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface ProjectDetailProps {
  projectId: string
  onClose: () => void
}

export function ProjectDetail({ projectId, onClose }: ProjectDetailProps) {
  const { state, updateTask, updateProject } = useWorkOS()
  const project = state.projects.find(p => p.id === projectId)
  const tasks = state.tasks.filter(t => t.projectId === projectId)
  const members = state.members.filter(m => project?.memberIds?.includes(m.id))

  if (!project) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-accent">
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <button 
                onClick={() => {
                  const newName = prompt('Nhập tên dự án mới:', project.name)
                  if (newName && newName !== project.name) {
                    updateProject(project.id, { name: newName })
                  }
                }}
                className="p-1 text-zinc-500 hover:text-signal transition-colors"
                title="Đổi tên dự án"
              >
                <Edit2 className="size-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium border border-zinc-800">
              <span className="size-2 rounded-full bg-signal" />
              {project.progress}% Hoàn thành
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Chi tiết dự án
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Project Info & Members */}
          <aside className="w-80 border-r bg-zinc-950/50 p-6 overflow-y-auto">
            <section className="mb-8">
              <h3 className="os-label mb-3">Thông tin chung</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-zinc-500 block">Mô tả</label>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {project.description || 'Chưa có mô tả cho dự án này.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-zinc-500 block">Giá trị HĐ</label>
                    <p className="text-sm font-medium">{project.contractValue?.toLocaleString()} ₫</p>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 block">Đã thanh toán</label>
                    <p className="text-sm font-medium text-emerald-400">{project.paidAmount?.toLocaleString()} ₫</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="os-label">Nhân sự tham gia</h3>
                <button className="p-1 text-signal hover:bg-signal/10 rounded">
                  <UserPlus className="size-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border border-zinc-800 bg-card">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                        {m.name[0]}
                      </div>
                      <span className="text-xs font-medium">{m.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{m.role}</span>
                  </div>
                ))}
                {members.length === 0 && <p className="text-[11px] text-zinc-600 italic">Chưa có nhân sự được gán.</p>}
              </div>
            </section>
          </aside>

          {/* Right: Tasks & Work */}
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="flex items-center justify-between mb-6">
              <h3 className="os-label">Danh sách công việc</h3>
              <Button size="sm" className="h-8 text-xs bg-signal text-signal-foreground">
                + Thêm việc mới
              </Button>
            </div>

            <div className="grid gap-3">
              {tasks.map(task => (
                <div key={task.id} className="group flex items-center justify-between p-3 rounded-xl border bg-card hover:border-signal/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`size-2 rounded-full ${
                      task.status === 'done' ? 'bg-emerald-500' : 
                      task.status === 'blocked' ? 'bg-rose-500' : 'bg-zinc-600'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Calendar className="size-3" />
                          {task.due}
                        </div>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          task.priority === 'cao' ? 'border-rose-500/50 text-rose-400' : 
                          task.priority === 'trung bình' ? 'border-amber-500/50 text-amber-400' : 'border-zinc-700 text-zinc-500'
                        }`}>
                          {task.priority}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <UserPlus className="size-3" />
                          {state.members.find(m => m.id === task.assigneeId)?.name || 'Chưa gán'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const memberId = prompt('Nhập ID nhân sự muốn gán (hoặc tên):', task.assigneeId)
                        if (memberId) {
                          const member = state.members.find(m => m.id === memberId || m.name === memberId)
                          if (member) {
                            updateTask(task.id, { assigneeId: member.id })
                          } else {
                            alert('Không tìm thấy nhân sự này.')
                          }
                        }
                      }}
                      className="p-1.5 text-zinc-500 hover:text-signal transition-colors"
                      title="Gán nhân sự"
                    >
                      <UserCheck className="size-4" />
                    </button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
                  <p className="text-sm text-zinc-500">Không có công việc nào trong dự án này.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
