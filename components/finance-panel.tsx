'use client'

import { useRef, useState } from 'react'
import { Banknote, CalendarClock, CircleAlert, IdCard, ImagePlus, Landmark, PiggyBank, Plus, Trash2, Wallet, X } from 'lucide-react'
import { fmtDate } from '@/lib/copilot-engine'
import { formatVND, parseMoneyInput } from '@/lib/money'
import { useWorkOS } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Member } from '@/lib/types'

const inputCls = 'w-full rounded-lg bg-zinc-800/80 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none ring-1 ring-zinc-700/80 placeholder:text-zinc-500 focus:ring-zinc-400'
const labelCls = 'mb-1 block text-[11px] font-medium text-zinc-500'

function MoneyInput({ value, onCommit, placeholder }: { value?: number; onCommit: (v: number | undefined) => void; placeholder?: string }) {
  return (
    <input
      inputMode="numeric"
      defaultValue={value !== undefined ? new Intl.NumberFormat('vi-VN').format(value) : ''}
      key={String(value ?? '')}
      onBlur={(e) => onCommit(parseMoneyInput(e.target.value))}
      placeholder={placeholder ?? '0'}
      className={inputCls}
    />
  )
}

export function FinancePanel() {
  const { state, ui, updateProject, updateMember, canFinance, canWrite } = useWorkOS()
  if (!ui.features.finance) return null

  const projects = state.projects
  const totalContract = projects.reduce((s, p) => s + (p.contractValue ?? 0), 0)
  const totalPaid = projects.reduce((s, p) => s + (p.paidAmount ?? 0), 0)
  const totalReceivable = Math.max(0, totalContract - totalPaid)
  const payroll = state.members.reduce((s, m) => s + (m.salary ?? 0) + (m.bonus ?? 0), 0)
  const payrollPaid = state.members.filter((m) => m.payStatus === 'paid').reduce((s, m) => s + (m.salary ?? 0) + (m.bonus ?? 0), 0)
  const pendingPayItems = state.members.flatMap((m) => (m.payItems ?? []).filter((x) => x.status === 'pending').map((x) => ({ ...x, memberName: m.name })))
  const pendingPayTotal = pendingPayItems.reduce((s, x) => s + x.amount, 0)
  const missingBank = state.members.filter((m) => !m.bankAccount)
  const today = new Date(new Date().toDateString())
  const overduePayments = projects.filter((p) => p.paymentDue && new Date(p.paymentDue) < today && (p.contractValue ?? 0) > (p.paidAmount ?? 0))

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-zinc-50">Tài chính & thù lao</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">Điền trực tiếp vào từng ô — số liệu tự tổng hợp. Copilot cũng cập nhật được qua prompt.</p>
        </div>
        {overduePayments.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-amber-400/30">
            <CircleAlert className="size-3.5" /> {overduePayments.length} khoản thu quá hạn
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard icon={Landmark} label="Tổng giá trị hợp đồng" value={formatVND(totalContract)} sub={`${projects.filter((p) => p.contractValue).length} dự án có số liệu`} />
        <SummaryCard icon={Wallet} label="Đã thu từ khách" value={formatVND(totalPaid)} sub={totalContract ? `${Math.round((totalPaid / totalContract) * 100)}% tổng hợp đồng` : 'Chưa có dữ liệu'} />
        <SummaryCard icon={Banknote} label="Còn phải thu (công nợ)" value={formatVND(totalReceivable)} tone={totalReceivable > 0 ? 'warn' : undefined} sub={overduePayments.length ? `${overduePayments.length} khoản quá hạn` : 'Không có khoản quá hạn'} />
        <SummaryCard icon={PiggyBank} label="Quỹ lương + thưởng kỳ này" value={formatVND(payroll)} sub={canFinance ? `Đã chi ${formatVND(payrollPaid)} · chờ chi theo đợt ${formatVND(pendingPayTotal)}` : `Đã chi ${formatVND(payrollPaid)}`} />
      </div>

      {!canWrite ? <p className="rounded-xl bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 ring-1 ring-zinc-800">Vai trò của bạn chỉ được xem số liệu. Manager/Admin mới sửa được dữ liệu; riêng lương chỉ Admin xem và sửa.</p> : null}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* Receivables per project */}
        <div className="rounded-2xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
          <h3 className="text-[13px] font-semibold text-zinc-100">Giá trị dự án & công nợ khách hàng</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Sửa giá trị hợp đồng, số đã thu và hạn thu tiền cho từng dự án.</p>
          <div className="mt-3 space-y-3">
            {projects.length === 0 ? <p className="text-[13px] text-zinc-600">Chưa có dự án nào.</p> : null}
            {projects.map((p) => {
              const remain = Math.max(0, (p.contractValue ?? 0) - (p.paidAmount ?? 0))
              const overdue = p.paymentDue && new Date(p.paymentDue) < today && remain > 0
              return (
                <div key={p.id} className="rounded-xl bg-zinc-800/40 p-3 ring-1 ring-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-zinc-100">{p.name}</div>
                      <div className="text-[11px] text-zinc-500">{p.client ?? 'Dự án nội bộ'}</div>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', remain === 0 && p.contractValue ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30' : overdue ? 'bg-amber-400/10 text-amber-300 ring-amber-400/30' : 'bg-zinc-800 text-zinc-200 ring-zinc-700')}>
                      {p.contractValue === undefined ? 'Chưa nhập' : remain === 0 ? 'Đã thu đủ' : `Còn thu ${formatVND(remain)}`}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div><label className={labelCls}>Giá trị hợp đồng (₫)</label><fieldset disabled={!canWrite} className="contents"><MoneyInput value={p.contractValue} onCommit={(v) => updateProject(p.id, { contractValue: v })} /></fieldset></div>
                    <div><label className={labelCls}>Đã thu (₫)</label><fieldset disabled={!canWrite} className="contents"><MoneyInput value={p.paidAmount} onCommit={(v) => updateProject(p.id, { paidAmount: v })} /></fieldset></div>
                    <div><label className={labelCls}>Hạn thu tiền</label><input type="date" value={p.paymentDue ?? ''} onChange={(e) => updateProject(p.id, { paymentDue: e.target.value || undefined })} className={inputCls} /></div>
                  </div>
                  <input defaultValue={p.paymentNote ?? ''} key={p.paymentNote ?? ''} onBlur={(e) => updateProject(p.id, { paymentNote: e.target.value.trim() || undefined })} placeholder="Ghi chú thanh toán: đợt 1/2, điều kiện nghiệm thu…" className={cn(inputCls, 'mt-2')} />
                  {p.paymentDue ? <p className="mt-1.5 text-[11px] text-zinc-600">Hạn thu: {fmtDate(p.paymentDue)}{overdue ? ' — đã quá hạn' : ''}</p> : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Payroll per member — admin only */}
        {canFinance ? (
        <div className="rounded-2xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
          <h3 className="text-[13px] font-semibold text-zinc-100">Thù lao nhân sự</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Lương tháng, thưởng, tài khoản nhận lương và trạng thái chi trả cho từng người.</p>
          {missingBank.length > 0 ? (
            <p className="mt-2 rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs text-amber-100 ring-1 ring-amber-400/25">
              {missingBank.length} người chưa có số tài khoản: {missingBank.map((m) => m.name).join(', ')}. Hãy bổ sung trước kỳ chi lương.
            </p>
          ) : null}
          <div className="mt-3 space-y-3">
            {state.members.map((m) => {
              const total = (m.salary ?? 0) + (m.bonus ?? 0)
              return (
                <div key={m.id} className="rounded-xl bg-zinc-800/40 p-3 ring-1 ring-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-zinc-100">{m.name}</div>
                      <div className="text-[11px] text-zinc-500">{m.role}</div>
                    </div>
                    <button onClick={() => updateMember(m.id, { payStatus: m.payStatus === 'paid' ? 'unpaid' : 'paid' })} className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 transition', m.payStatus === 'paid' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30' : 'bg-zinc-800 text-zinc-300 ring-zinc-700 hover:text-white')}>
                      {m.payStatus === 'paid' ? 'Đã chi trả' : 'Chưa chi'} · {formatVND(total)}
                    </button>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div><label className={labelCls}>Lương tháng (₫)</label><MoneyInput value={m.salary} onCommit={(v) => updateMember(m.id, { salary: v })} /></div>
                    <div><label className={labelCls}>Thưởng kỳ này (₫)</label><MoneyInput value={m.bonus} onCommit={(v) => updateMember(m.id, { bonus: v })} /></div>
                    <div><label className={labelCls}>Ngân hàng</label><input defaultValue={m.bankName ?? ''} key={m.bankName ?? ''} onBlur={(e) => updateMember(m.id, { bankName: e.target.value.trim() || undefined })} placeholder="Vietcombank…" className={inputCls} /></div>
                    <div><label className={labelCls}>Số tài khoản</label><input defaultValue={m.bankAccount ?? ''} key={m.bankAccount ?? ''} onBlur={(e) => updateMember(m.id, { bankAccount: e.target.value.trim() || undefined })} placeholder="0123456789" className={inputCls} /></div>
                    <div><label className={labelCls}>Số CCCD</label><input defaultValue={m.idNumber ?? ''} key={m.idNumber ?? ''} onBlur={(e) => updateMember(m.id, { idNumber: e.target.value.trim() || undefined })} placeholder="001234567890" className={inputCls} /></div>
                    <div><label className={labelCls}>Ngày thanh toán lương</label><input type="date" value={m.payDate ?? ''} onChange={(e) => updateMember(m.id, { payDate: e.target.value || undefined })} className={inputCls} /></div>
                  </div>
                  <IdCardUpload member={m} />
                  <PayItems member={m} />
                </div>
              )
            })}
          </div>
        </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-5">
            <h3 className="text-[13px] font-semibold text-zinc-200">Thù lao nhân sự</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">Thông tin lương, thưởng và tài khoản ngân hàng chỉ hiển thị với tài khoản <span className="text-zinc-200">Admin</span>. Bạn đang đăng nhập bằng vai trò không có quyền này nên dữ liệu đã được ẩn ngay từ máy chủ.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function SummaryCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Icon className="size-4" />{label}</div>
      <div className={cn('mt-2 truncate text-lg font-semibold tracking-tight', tone === 'warn' ? 'text-amber-300' : 'text-zinc-50')}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-zinc-500">{sub}</div>
    </div>
  )
}


function IdCardUpload({ member: m }: { member: Member }) {
  const { updateMember } = useWorkOS()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | null) {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) { setError('Chỉ nhận file ảnh CCCD.'); return }
    if (file.size > 400_000) { setError('Ảnh quá lớn (tối đa ~400KB). Hãy nén ảnh trước khi tải lên.'); return }
    const reader = new FileReader()
    reader.onload = () => updateMember(m.id, { idCardImage: String(reader.result ?? ''), idCardName: file.name })
    reader.readAsDataURL(file)
  }

  return (
    <div className="mt-2.5">
      <label className={labelCls}>Ảnh CCCD</label>
      {m.idCardImage ? (
        <div className="flex items-start gap-3 rounded-xl bg-zinc-900/60 p-2.5 ring-1 ring-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.idCardImage} alt={`CCCD của ${m.name}`} className="h-16 w-24 shrink-0 rounded-lg object-cover ring-1 ring-zinc-700" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-300"><IdCard className="size-3.5" />{m.idCardName ?? 'Ảnh CCCD'}</div>
            <div className="mt-1 flex gap-1.5">
              <button onClick={() => inputRef.current?.click()} className="rounded-lg bg-zinc-800 px-2 py-1 text-[11px] text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700">Đổi ảnh</button>
              <button onClick={() => updateMember(m.id, { idCardImage: undefined, idCardName: undefined })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:text-red-300"><X className="size-3" />Xoá ảnh</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-3 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200">
          <ImagePlus className="size-4" /> Tải ảnh CCCD (mặt trước)
        </button>
      )}
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
    </div>
  )
}

function PayItems({ member: m }: { member: Member }) {
  const { state, updateMember } = useWorkOS()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [projectId, setProjectId] = useState('')
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const items = m.payItems ?? []
  const pendingTotal = items.filter((x) => x.status === 'pending').reduce((sum, x) => sum + x.amount, 0)
  const today = new Date(new Date().toDateString())

  function addItem() {
    if (!title.trim()) return
    const item = {
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      projectId: projectId || undefined,
      amount: parseMoneyInput(amount) ?? 0,
      deadline,
      status: 'pending' as const,
    }
    updateMember(m.id, { payItems: [...items, item] })
    setTitle(''); setAmount('')
  }

  function patchItem(id: string, patch: Partial<(typeof items)[number]>) {
    updateMember(m.id, { payItems: items.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  }

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300"><CalendarClock className="size-3.5" /> Khoản chi trả theo dự án / đợt</span>
        <span className="text-[11px] text-zinc-500">{items.length} khoản{pendingTotal ? ` · chờ chi ${formatVND(pendingTotal)}` : ''}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((x) => {
            const overdue = x.status === 'pending' && new Date(x.deadline) < today
            const project = state.projects.find((p) => p.id === x.projectId)
            return (
              <li key={x.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/60 px-2.5 py-2 ring-1 ring-zinc-800">
                <button onClick={() => patchItem(x.id, { status: x.status === 'paid' ? 'pending' : 'paid' })} className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', x.status === 'paid' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30' : overdue ? 'bg-amber-400/10 text-amber-200 ring-amber-400/30' : 'bg-zinc-800 text-zinc-300 ring-zinc-700')}>
                  {x.status === 'paid' ? 'Đã chi' : overdue ? 'Quá hạn' : 'Chờ chi'}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-zinc-100">{x.title}</span>
                  <span className="block truncate text-[10px] text-zinc-500">{project ? project.name : 'Khoản chung'} · hạn {fmtDate(x.deadline)}</span>
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-100">{formatVND(x.amount)}</span>
                <button onClick={() => patchItem(x.id, { status: x.status === 'paid' ? 'pending' : 'paid' })} className="sr-only">Đổi trạng thái</button>
                <button onClick={() => updateMember(m.id, { payItems: items.filter((y) => y.id !== x.id) })} className="shrink-0 rounded p-1 text-zinc-600 hover:text-red-300" aria-label="Xoá khoản chi"><Trash2 className="size-3.5" /></button>
              </li>
            )
          })}
        </ul>
      ) : <p className="mt-1.5 text-[11px] text-zinc-600">Chưa có khoản chi theo dự án. Thêm khoản đầu tiên bên dưới, hoặc nói với Copilot.</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên khoản: Thù lao đợt 1…" className={inputCls} />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Số tiền (₫)" className={inputCls} />
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
          <option value="">Khoản chung (không theo dự án)</option>
          {state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
      </div>
      <button onClick={addItem} disabled={!title.trim()} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-40"><Plus className="size-3.5" /> Thêm khoản chi</button>
    </div>
  )
}
