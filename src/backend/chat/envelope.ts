export type ChatRole = 'user' | 'assistant'

export const CHAT_ENVELOPE_PREFIX = '__bepro_ai_v1__'

type EnvelopePayload = {
  v: number
  role: ChatRole
  text: string
}

type LegacyEnvelopePayload = {
  role?: unknown
  text?: unknown
  content?: unknown
}

export function encodeChatContent(role: ChatRole, text: string) {
  const payload: EnvelopePayload = {
    v: 1,
    role,
    text,
  }

  return `${CHAT_ENVELOPE_PREFIX}${JSON.stringify(payload)}`
}

export function decodeChatContent(rawContent: string, fallbackRole: ChatRole) {
  if (!rawContent.startsWith(CHAT_ENVELOPE_PREFIX)) {
    return {
      role: fallbackRole,
      text: rawContent,
    }
  }

  const serializedPayload = rawContent.slice(CHAT_ENVELOPE_PREFIX.length)

  try {
    const parsed = JSON.parse(serializedPayload) as LegacyEnvelopePayload
    const role = parsed.role === 'assistant' ? 'assistant' : 'user'
    const candidateText = typeof parsed.text === 'string'
      ? parsed.text
      : typeof parsed.content === 'string'
      ? parsed.content
      : rawContent

    return {
      role,
      text: candidateText,
    }
  } catch {
    return {
      role: fallbackRole,
      text: rawContent,
    }
  }
}
