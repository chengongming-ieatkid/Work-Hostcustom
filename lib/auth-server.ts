import { cookies } from 'next/headers'
import { getSessionUser, type DbUser } from './db'

export const SESSION_COOKIE = 'tvq-session'

export async function currentUser(): Promise<DbUser | null> {
  const store = await cookies()
  return getSessionUser(store.get(SESSION_COOKIE)?.value)
}
