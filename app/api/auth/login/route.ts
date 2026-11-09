import { NextResponse } from 'next/server'
import { authenticate, createSession } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/auth-server'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Thiếu email hoặc mật khẩu' }, { status: 400 })
  }
  const user = authenticate(body.email, body.password)
  if (!user) {
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
  }
  const token = createSession(user.id)
  const res = NextResponse.json({ user })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  })
  return res
}
