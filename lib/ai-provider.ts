export type AIProviderKind = 'bedrock' | 'muse-spark' | 'custom'

export interface AIProviderConfig {
  provider: AIProviderKind
  baseUrl: string
  apiKey: string
  model: string
}

export interface AIProviderStored {
  provider?: string | null
  baseUrl?: string | null
  apiKey?: string | null
  model?: string | null
}

export const PROVIDER_META: Record<
  AIProviderKind,
  { label: string; defaultModel: string; urlPlaceholder: string; keyLabel: string; keyPlaceholder: string; hint: string }
> = {
  bedrock: {
    label: 'AWS Bedrock',
    defaultModel: 'zai.glm-5',
    urlPlaceholder: 'https://bedrock-mantle.us-east-1.api.aws/v1/chat/completions',
    keyLabel: 'Bearer Key (ABSK)',
    keyPlaceholder: 'ABSK...',
    hint: 'Dùng AWS_REGION + AWS_BEARER_KEY từ .env.local nếu để trống.',
  },
  'muse-spark': {
    label: 'Muse Spark',
    defaultModel: 'muse-spark',
    urlPlaceholder: 'https://.../v1/chat/completions',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-...',
    hint: 'Điền base URL (OpenAI-compatible chat/completions), key và tên model.',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    defaultModel: '',
    urlPlaceholder: 'https://your-host/v1/chat/completions',
    keyLabel: 'API Key',
    keyPlaceholder: 'sk-...',
    hint: 'Mọi endpoint tương thích OpenAI chat/completions.',
  },
}

const BEDROCK_DEFAULT_MODEL = 'zai.glm-5'

function bedrockDefaultUrl(): string {
  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://bedrock-mantle.${region}.api.aws/v1/chat/completions`
}

export function resolveAIProvider(stored?: AIProviderStored | null): AIProviderConfig {
  const provider = (stored?.provider || process.env.AI_PROVIDER || 'bedrock') as AIProviderKind
  const kind: AIProviderKind = provider === 'muse-spark' || provider === 'custom' ? provider : 'bedrock'

  const envUrl = process.env.AI_BASE_URL || ''
  const envKey = process.env.AI_API_KEY || ''
  const envModel = process.env.AI_MODEL || ''

  const baseUrl =
    stored?.baseUrl || envUrl || (kind === 'bedrock' ? bedrockDefaultUrl() : '')
  const apiKey =
    stored?.apiKey || envKey || (kind === 'bedrock' ? process.env.AWS_BEARER_KEY || '' : '')
  const model =
    stored?.model ||
    envModel ||
    (kind === 'bedrock' ? BEDROCK_DEFAULT_MODEL : PROVIDER_META[kind].defaultModel)

  return { provider: kind, baseUrl, apiKey, model }
}

export function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '••••'
  return `••••${key.slice(-4)}`
}

// Accept a host root (https://host), a /v1 prefix, or a full
// /chat/completions URL — always produce the chat endpoint.
export function normalizeChatUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, '')
  if (/\/chat\/completions$/i.test(url)) return url
  if (/\/v1$/i.test(url)) return `${url}/chat/completions`
  return `${url}/v1/chat/completions`
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function callChatCompletions(
  config: AIProviderConfig,
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  if (!config.apiKey) throw new Error('AI API key chưa được cấu hình')
  if (!config.baseUrl) throw new Error('AI base URL chưa được cấu hình')
  if (!config.model) throw new Error('AI model chưa được cấu hình')

  const label = PROVIDER_META[config.provider].label
  const endpoint = normalizeChatUrl(config.baseUrl)
  console.log(`[API] Calling ${label} (${config.model})...`)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  console.log('[API] Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[API] Error:', response.status, errorText)
    throw new Error(`${label} API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content || data.content || ''
  if (!content) throw new Error('No content in response')
  return content
}
