'use client'

import { useState } from 'react'
import { X, UserPlus, Edit2, Trash2, CreditCard, FileText, Search, ChevronRight } from 'lucide-react'
import { useWorkOS } from '@/lib/store'
import type { Member } from '@/lib/types'
import { Button } from '@/components/ui/button'

export function MemberManagement() {
  const { state, updateMember, removeMember } = useWorkOS()
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMembers = state.members.filter(m => 
    (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedMember = state.members.find(m => m.id === selectedMemberId)

  if (selectedMemberId) {
    const m = selectedMember!
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedMemberId(null)} className="rounded-md p-2 text-muted-foreground hover:bg-accent">
                <X className="size-5" />
              </button>
              <h1 className="text-xl font-bold">{m.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={() => { if(confirm('Xoá nhân sự này?')) removeMember(m.id); setSelectedMemberId(null); }} className="h-8 text-xs">
                <Trash2 className="size-3 mr-1" /> Xoá
              </Button>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <aside className="w-64 border-r bg-zinc-950/50 p-6 overflow-y-auto">
              <h3 className="os-label mb-4">Thông tin cơ bản</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-zinc-500 block">Vai trò</label>
                  <input 
                    className="w-full bg-transparent border-b border-zinc-800 py-1 text-sm focus:border-signal outline-none"
                    value={m.role}
                    onChange={(e) => updateMember(m.id, { role: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Công suất (h/ngày)</label>
                  <input 
                    type="number"
                    className="w-full bg-transparent border-b border-zinc-800 py-1 text-sm focus:border-signal outline-none"
                    value={m.capacity}
                    onChange={(e) => updateMember(m.id, { capacity: Number(e.target.value) })}
                  />
                </div>
              </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="os-label">Hồ sơ định danh</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-zinc-500 block">Số CCCD</label>
                      <input 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-signal"
                        value={m.idNumber || ''}
                        onChange={(e) => updateMember(m.id, { idNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500 block">Họ tên trên CCCD</label>
                      <input 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-signal"
                        value={m.idCardName || ''}
                        onChange={(e) => updateMember(m.id, { idCardName: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="os-label">Thông tin ngân hàng</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-zinc-500 block">Tên ngân hàng</label>
                      <input 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-signal"
                        value={m.bankName || ''}
                        onChange={(e) => updateMember(m.id, { bankName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500 block">Số tài khoản</label>
                      <input 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-signal"
                        value={m.bankAccount || ''}
                        onChange={(e) => updateMember(m.id, { bankAccount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="os-label">Chi tiết thù lao & Lương</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">Trạng thái:</span>
                    <span className={`text-[10px] font-bold ${m.payStatus === 'paid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {m.payStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <label className="text-[11px] text-zinc-500 block">Lương cơ bản</label>
                    <input 
                      type="number"
                      className="w-full bg-transparent text-lg font-bold outline-none"
                      value={m.salary || 0}
                      onChange={(e) => updateMember(m.id, { salary: Number(e.target.value) })}
                    />
                    <span className="text-[10px] text-zinc-600">VND / tháng</span>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <label className="text-[11px] text-zinc-500 block">Thưởng kỳ này</label>
                    <input 
                      type="number"
                      className="w-full bg-transparent text-lg font-bold outline-none"
                      value={m.bonus || 0}
                      onChange={(e) => updateMember(m.id, { bonus: Number(e.target.value) })}
                    />
                    <span className="text-[10px] text-zinc-600">VND</span>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <label className="text-[11px] text-zinc-500 block">Ngày chi trả</label>
                    <input 
                      className="w-full bg-transparent text-sm font-medium outline-none"
                      value={m.payDate || ''}
                      onChange={(e) => updateMember(m.id, { payDate: e.target.value })}
                    />
                    <span className="text-[10px] text-zinc-600">Ngày/Tháng</span>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Quản lý Nhân sự</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input 
              className="pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm outline-none focus:ring-1 ring-signal w-64"
              placeholder="Tìm tên, vai trò..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Button size="sm" className="bg-signal text-signal-foreground h-8 text-xs">
          <UserPlus className="size-3 mr-1" /> Thêm nhân sự
        </Button>
      </div>

      <div className="grid gap-3">
        {filteredMembers.map(m => (
          <div 
            key={m.id} 
            onClick={() => setSelectedMemberId(m.id)}
            className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:border-signal/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                {m.name[0]}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-100">{m.name}</div>
                <div className="text-xs text-zinc-500">{m.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="os-label">Tải việc</div>
                <div className="text-sm font-mono font-medium">{Math.round((m.load / m.capacity) * 100)}%</div>
              </div>
              <ChevronRight className="size-4 text-zinc-600 group-hover:text-signal transition-colors" />
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-500">Không tìm thấy nhân sự nào.</p>
          </div>
        )}
      </div>
    </div>
  )
}
