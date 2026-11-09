import { NextResponse } from 'next/server'
import { canEditFinance, canWrite, getState, redactStateForRole, resetState, saveState } from '@/lib/db'
import { currentUser } from '@/lib/auth-server'
import type { WorkState } from '@/lib/types'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const { state, ui, updatedAt } = getState()
  return NextResponse.json({ state: redactStateForRole(state, user.role), ui, updatedAt, user })
}

export async function PUT(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (!canWrite(user.role)) return NextResponse.json({ error: 'Vai trò của bạn chỉ được xem, không được sửa dữ liệu' }, { status: 403 })

  const body = (await req.json().catch(() => null)) as { state?: WorkState; ui?: Record<string, unknown> } | null
  if (!body?.state) return NextResponse.json({ error: 'Thiếu state' }, { status: 400 })

  let nextState = body.state
  // Non-admin writers (manager) must not overwrite salary fields they cannot see:
  // restore finance fields from the stored state.
  if (!canEditFinance(user.role)) {
    const { state: stored } = getState()
    const storedById = new Map(stored.members.map((m) => [m.id, m]))
    nextState = {
      ...nextState,
      members: nextState.members.map((m) => {
        const old = storedById.get(m.id)
        if (!old) return { ...m, salary: undefined, bonus: undefined, bankName: undefined, bankAccount: undefined, payStatus: undefined, payNote: undefined, idNumber: undefined, idCardImage: undefined, idCardName: undefined, payDate: undefined, payItems: undefined }
        return { ...m, salary: old.salary, bonus: old.bonus, bankName: old.bankName, bankAccount: old.bankAccount, payStatus: old.payStatus, payNote: old.payNote, idNumber: old.idNumber, idCardImage: old.idCardImage, idCardName: old.idCardName, payDate: old.payDate, payItems: old.payItems }
      }),
    }
  }

  const updatedAt = saveState(nextState, body.ui ?? {})
  return NextResponse.json({ ok: true, updatedAt, state: redactStateForRole(nextState, user.role) })
}

export async function DELETE() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Chỉ Admin mới được reset dữ liệu' }, { status: 403 })
  const { state, ui, updatedAt } = resetState()
  return NextResponse.json({ ok: true, state: redactStateForRole(state, user.role), ui, updatedAt })
}
