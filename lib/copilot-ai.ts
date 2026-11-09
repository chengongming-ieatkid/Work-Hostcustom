import type { Analysis, CopilotReply, Plan, PlanAction, WorkState } from './types'

const API_ENDPOINT = '/api/copilot'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface APIResponse {
  success: boolean
  content: string
  model: string
  timestamp: string
}

// Store conversation history
let conversationHistory: Message[] = []

export function clearHistory() {
  conversationHistory = []
}

// Extract JSON from AI response (handles ```json fences, embedded JSON, etc.)
function extractJSON(content: string): Record<string, unknown> | null {
  const trimmed = content.trim()

  // 1. Direct parse
  try {
    return JSON.parse(trimmed)
  } catch {
    /* continue */
  }

  // 2. Strip markdown code fences ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      /* continue */
    }
  }

  // 3. Find outermost { ... } in text
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      /* continue */
    }
  }

  return null
}

export async function interpretWithAI(
  prompt: string,
  state: WorkState,
  mode: 'command' | 'executive',
  ui?: { features: Record<string, boolean>; sections: { id: string; title: string; view: string }[]; appName: string; projectLayout: string; accent: string; theme?: string; design?: Record<string, unknown> }
): Promise<CopilotReply> {
  try {
    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: prompt,
    })

    // Prepare context for AI with REAL IDs for actions
    const context = {
      mode,
      ui,
      state: {
        members: state.members.map(m => ({
          id: m.id, // QUAN TRỌNG: ID thật để AI dùng trong payload
          name: m.name,
          role: m.role,
          load: m.load,
          capacity: m.capacity,
          loadRatio: (m.load / m.capacity).toFixed(2),
        })),
        projects: state.projects.map(p => ({
          id: p.id, // QUAN TRỌNG: ID thật
          name: p.name,
          health: p.health,
          progress: p.progress,
          client: p.client,
          description: p.description,
          contractValue: p.contractValue,
          paidAmount: p.paidAmount,
          receivable: p.contractValue !== undefined ? Math.max(0, p.contractValue - (p.paidAmount ?? 0)) : undefined,
          paymentDue: p.paymentDue,
          memberIds: p.memberIds ?? [],
          memberNames: (p.memberIds ?? []).map((mid) => state.members.find((m) => m.id === mid)?.name).filter(Boolean),
        })),
        tasks: state.tasks.map(t => ({
          id: t.id, // QUAN TRỌNG: ID thật
          title: t.title,
          status: t.status,
          priority: t.priority,
          due: t.due,
          blocked: t.blocked,
          assigneeId: t.assigneeId,
          projectId: t.projectId,
        })),
        decisions: state.decisions.filter(d => d.status === 'pending').map(d => ({
          id: d.id,
          title: d.title,
          context: d.context,
        })),
      },
    }

    // Call API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: conversationHistory,
        context,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: APIResponse = await response.json()

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: data.content,
    })

    // Parse structured plan from AI response (handles ```json fences)
    const parsed = extractJSON(data.content)
    if (parsed && parsed.plan && typeof parsed.plan === 'object') {
      const planObj = parsed.plan as Partial<Plan>
      if (Array.isArray(planObj.actions) && planObj.actions.length > 0) {
        const normalized = normalizePlan(planObj, mode)
        // Safety net: models sometimes drop "mô tả: ..." — recover it from the user's own words
        const descMatch = prompt.match(/mô tả\s*[:：]\s*(.+?)(?=,\s*(giao cho|hạn|deadline|ưu tiên)|$)/i)
        if (descMatch) {
          for (const a of normalized.actions) {
            if (a.type === 'create_task' && !a.payload?.description) {
              a.payload = { ...(a.payload ?? {}), description: descMatch[1].trim() }
            }
          }
        }
        return {
          text: (parsed.text as string) || 'Đây là kế hoạch đề xuất của tôi:',
          plan: normalized,
          widget: parsed.widget && typeof parsed.widget === 'object' ? (parsed.widget as CopilotReply['widget']) : undefined,
        }
      }
    }
    if (parsed && parsed.widget && typeof parsed.widget === 'object') {
      return {
        text: (parsed.text as string) || data.content,
        widget: parsed.widget as CopilotReply['widget'],
      }
    }

    return {
      text: data.content,
    }
  } catch (error) {
    console.error('AI interpretation error:', error)
    // Fallback to local interpretation
    return fallbackReply(prompt, state, mode)
  }
}

function normalizePlan(rawPlan: Partial<Plan>, mode: 'command' | 'executive'): Plan {
  const uid = () => `plan-${crypto.randomUUID()}`
  const actId = () => `act-${crypto.randomUUID()}`

  return {
    id: rawPlan.id || uid(),
    mode: rawPlan.mode || mode,
    title: rawPlan.title || 'Kế hoạch từ AI',
    reasoning: rawPlan.reasoning || [],
    actions: (rawPlan.actions || []).map((a: Partial<PlanAction>) => ({
      id: a.id || actId(),
      level: a.level || 2,
      type: a.type || 'create_task',
      summary: a.summary || '',
      detail: a.detail,
      payload: a.payload,
    })),
    impact: rawPlan.impact || [],
    status: 'pending',
  }
}

function fallbackReply(prompt: string, state: WorkState, mode: 'command' | 'executive'): CopilotReply {
  const lowerPrompt = prompt.toLowerCase()

  // Simple fallback logic
  if (lowerPrompt.includes('phân tích') || lowerPrompt.includes('tình hình')) {
    const overdue = state.tasks.filter(t => t.status !== 'done' && new Date(t.due) < new Date())
    const blocked = state.tasks.filter(t => t.blocked && t.status !== 'done')
    const pending = state.decisions.filter(d => d.status === 'pending')

    return {
      text: `Phân tích tình hình: ${overdue.length} task trễ deadline, ${blocked.length} blocker, ${pending.length} quyết định đang chờ. Team workload trung bình: ${Math.round(state.members.reduce((sum, m) => sum + m.load / m.capacity, 0) / state.members.length * 100)}%.`,
    }
  }

  if (lowerPrompt.includes('chia việc') || lowerPrompt.includes('giao')) {
    return {
      text: 'Tôi có thể giúp bạn chia việc. Vui lòng cung cấp thêm chi tiết: dự án nào, ai phụ trách, deadline khi nào?',
    }
  }

  return {
    text: 'Tôi có thể giúp bạn: phân tích tình hình, chia việc, chuyển task, hoặc sắp xếp ưu tiên. Bạn cần tôi làm gì?',
  }
}

// Export for use in components
export type { Message }
