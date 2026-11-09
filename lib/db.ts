import { DatabaseSync } from 'node:sqlite'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { WorkState } from './types'
import { buildSeed } from './seed'

export type Role = 'admin' | 'manager' | 'member'

export interface DbUser {
  id: string
  email: string
  name: string
  role: Role
  memberId?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(path.join(DATA_DIR, 'tvq-workos.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state TEXT NOT NULL,
    ui TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    member_id TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ai_provider (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT,
    base_url TEXT,
    api_key TEXT,
    model TEXT,
    updated_at TEXT NOT NULL
  );
`)

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const DEFAULT_USERS: { email: string; name: string; role: Role; password: string; memberId?: string }[] = [
  { email: 'admin@tvq.local', name: 'Founder (Admin)', role: 'admin', password: 'admin123', memberId: 'm-founder' },
  { email: 'manager@tvq.local', name: 'Quản lý', role: 'manager', password: 'manager123' },
  { email: 'member@tvq.local', name: 'Nhân viên', role: 'member', password: 'member123' },
]

function ensureSeed() {
  const row = db.prepare('SELECT id FROM app_state WHERE id = 1').get() as { id: number } | undefined
  if (!row) {
    db.prepare('INSERT INTO app_state (id, state, ui, updated_at) VALUES (1, ?, ?, ?)')
      .run(JSON.stringify(buildSeed()), JSON.stringify({}), new Date().toISOString())
  }
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }
  if (count.c === 0) {
    const insert = db.prepare('INSERT INTO users (id, email, name, role, member_id, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const u of DEFAULT_USERS) {
      insert.run(`u-${u.role}`, u.email, u.name, u.role, u.memberId ?? null, hashPassword(u.password), new Date().toISOString())
    }
  }
}
ensureSeed()

export function getState(): { state: WorkState; ui: Record<string, unknown>; updatedAt: string } {
  const row = db.prepare('SELECT state, ui, updated_at FROM app_state WHERE id = 1').get() as { state: string; ui: string; updated_at: string }
  return { state: JSON.parse(row.state) as WorkState, ui: JSON.parse(row.ui) as Record<string, unknown>, updatedAt: row.updated_at }
}

export function saveState(state: WorkState, ui: Record<string, unknown>): string {
  const now = new Date().toISOString()
  db.prepare('UPDATE app_state SET state = ?, ui = ?, updated_at = ? WHERE id = 1').run(JSON.stringify(state), JSON.stringify(ui), now)
  return now
}

export function resetState(): { state: WorkState; ui: Record<string, unknown>; updatedAt: string } {
  const state = buildSeed()
  const now = new Date().toISOString()
  db.prepare('UPDATE app_state SET state = ?, ui = ?, updated_at = ? WHERE id = 1').run(JSON.stringify(state), JSON.stringify({}), now)
  return { state, ui: {}, updatedAt: now }
}

export function authenticate(email: string, password: string): DbUser | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | { id: string; email: string; name: string; role: Role; member_id: string | null; password_hash: string }
    | undefined
  if (!row || !verifyPassword(password, row.password_hash)) return null
  return { id: row.id, email: row.email, name: row.name, role: row.role, memberId: row.member_id ?? undefined }
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), userId, expires)
  return token
}

export function getSessionUser(token: string | undefined): DbUser | null {
  if (!token) return null
  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.member_id FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).get(tokenHash(token), new Date().toISOString()) as
    | { id: string; email: string; name: string; role: Role; member_id: string | null }
    | undefined
  if (!row) return null
  return { id: row.id, email: row.email, name: row.name, role: row.role, memberId: row.member_id ?? undefined }
}

export function deleteSession(token: string | undefined) {
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token))
}

export function listUsers(): DbUser[] {
  const rows = db.prepare('SELECT id, email, name, role, member_id FROM users ORDER BY role, email').all() as {
    id: string; email: string; name: string; role: Role; member_id: string | null
  }[]
  return rows.map((r) => ({ id: r.id, email: r.email, name: r.name, role: r.role, memberId: r.member_id ?? undefined }))
}

export function createUser(input: { email: string; name: string; role: Role; password: string; memberId?: string }): DbUser {
  const id = `u-${randomBytes(6).toString('hex')}`
  db.prepare('INSERT INTO users (id, email, name, role, member_id, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, input.email.trim().toLowerCase(), input.name, input.role, input.memberId ?? null, hashPassword(input.password), new Date().toISOString())
  return { id, email: input.email.trim().toLowerCase(), name: input.name, role: input.role, memberId: input.memberId }
}

// Salary/bank fields are admin-only. Non-admins never receive them from the server.
export function redactStateForRole(state: WorkState, role: Role, currentMemberId?: string): WorkState {
  if (role === 'admin') return state
  
  return {
    ...state,
    members: state.members.map((m) => {
      const isSelf = currentMemberId && m.id === currentMemberId
      
      if (isSelf) return m // Always allow seeing your own sensitive data

      return {
        ...m,
        salary: undefined,
        bonus: undefined,
        bankName: undefined,
        bankAccount: undefined,
        payNote: undefined,
        payStatus: undefined,
        idNumber: undefined,
        idCardImage: undefined,
        idCardName: undefined,
        payDate: undefined,
        payItems: undefined,
      }
    }),
  }
}

export function canEditFinance(role: Role): boolean {
  return role === 'admin'
}

export function canWrite(role: Role): boolean {
  return role === 'admin' || role === 'manager'
}

export interface AIProviderRow {
  provider: string | null
  baseUrl: string | null
  apiKey: string | null
  model: string | null
}

export function getAIProvider(): AIProviderRow {
  const row = db.prepare('SELECT provider, base_url, api_key, model FROM ai_provider WHERE id = 1').get() as
    | { provider: string | null; base_url: string | null; api_key: string | null; model: string | null }
    | undefined
  if (!row) return { provider: null, baseUrl: null, apiKey: null, model: null }
  return { provider: row.provider, baseUrl: row.base_url, apiKey: row.api_key, model: row.model }
}

export function saveAIProvider(input: { provider: string; baseUrl: string; apiKey?: string; model: string }): AIProviderRow {
  const current = getAIProvider()
  const apiKey = input.apiKey !== undefined && input.apiKey !== '' ? input.apiKey : current.apiKey
  db.prepare(
    'INSERT INTO ai_provider (id, provider, base_url, api_key, model, updated_at) VALUES (1, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, base_url = excluded.base_url, api_key = excluded.api_key, model = excluded.model, updated_at = excluded.updated_at',
  ).run(input.provider, input.baseUrl, apiKey, input.model, new Date().toISOString())
  return getAIProvider()
}
