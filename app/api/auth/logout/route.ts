import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/auth-server'

export async function POST() {
  const store = await cookies()
  deleteSession(store.get(SESSION_COOKIE)?.value)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
