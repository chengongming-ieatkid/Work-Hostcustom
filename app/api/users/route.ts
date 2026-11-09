import { NextResponse } from 'next/server'
import { createUser, listUsers, type Role } from '@/lib/db'
import { currentUser } from '@/lib/auth-server'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Chỉ Admin mới xem được danh sách tài khoản' }, { status: 403 })
  return NextResponse.json({ users: listUsers() })
}

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Chỉ Admin mới tạo được tài khoản' }, { status: 403 })
  const body = (await req.json().catch(() => ({}))) as { email?: string; name?: string; role?: Role; password?: string; memberId?: string }
  if (!body.email || !body.name || !body.password || !body.role) {
    return NextResponse.json({ error: 'Thiếu email, tên, vai trò hoặc mật khẩu' }, { status: 400 })
  }
  try {
    const created = createUser({ email: body.email, name: body.name, role: body.role, password: body.password, memberId: body.memberId })
    return NextResponse.json({ user: created })
  } catch {
    return NextResponse.json({ error: 'Email đã tồn tại hoặc dữ liệu không hợp lệ' }, { status: 409 })
  }
}
