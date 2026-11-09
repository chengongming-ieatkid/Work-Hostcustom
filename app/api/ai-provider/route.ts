import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth-server'
import { getAIProvider, saveAIProvider } from '@/lib/db'
import { maskKey, PROVIDER_META, resolveAIProvider, type AIProviderKind } from '@/lib/ai-provider'

const KINDS: AIProviderKind[] = ['bedrock', 'muse-spark', 'custom']

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Chỉ Admin mới được xem cấu hình AI' }, { status: 403 })

  const stored = getAIProvider()
  const config = resolveAIProvider({
    provider: stored.provider,
    baseUrl: stored.baseUrl,
    apiKey: stored.apiKey,
    model: stored.model,
  })

  return NextResponse.json({
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
    hasKey: Boolean(config.apiKey),
    maskedKey: maskKey(config.apiKey),
    keySource: stored.apiKey ? 'database' : 'env',
  })
}

export async function PUT(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Chỉ Admin mới được đổi cấu hình AI' }, { status: 403 })

  const body = (await req.json().catch(() => null)) as {
    provider?: string
    baseUrl?: string
    apiKey?: string
    model?: string
  } | null
  if (!body) return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })

  const provider: AIProviderKind = KINDS.includes(body.provider as AIProviderKind)
    ? (body.provider as AIProviderKind)
    : 'bedrock'
  const baseUrl = (body.baseUrl ?? '').trim()
  const model = (body.model ?? '').trim() || PROVIDER_META[provider].defaultModel
  const apiKey = (body.apiKey ?? '').trim()

  if (!baseUrl && provider !== 'bedrock') {
    return NextResponse.json({ error: 'Thiếu base URL' }, { status: 400 })
  }
  if (!model) {
    return NextResponse.json({ error: 'Thiếu tên model' }, { status: 400 })
  }

  const stored = saveAIProvider({ provider, baseUrl, apiKey, model })
  const config = resolveAIProvider({
    provider: stored.provider,
    baseUrl: stored.baseUrl,
    apiKey: stored.apiKey,
    model: stored.model,
  })

  return NextResponse.json({
    ok: true,
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
    hasKey: Boolean(config.apiKey),
    maskedKey: maskKey(config.apiKey),
  })
}
