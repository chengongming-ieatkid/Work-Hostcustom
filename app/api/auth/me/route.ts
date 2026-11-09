import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth-server'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user })
}
