export type OpenAiServerConfig = {
  apiKey: string
  source: string
}

function cleanEnvValue(value: string | undefined) {
  if (!value) return ''
  return value.trim().replace(/^['"]|['"]$/g, '').trim()
}

const OPENAI_KEY_SOURCES = [
  'PLAYMAKER_OPENAI_API_KEY',
  'OPENAI_API_KEY',
] as const

export function getServerOpenAiConfig(): OpenAiServerConfig | null {
  for (const key of OPENAI_KEY_SOURCES) {
    const value = cleanEnvValue(process.env[key])
    if (!value) continue

    if (value.startsWith('sk-')) {
      return {
        apiKey: value,
        source: key,
      }
    }
  }

  return null
}

export function getServerOpenAiKeyError() {
  const foundSources = OPENAI_KEY_SOURCES.filter((key) => cleanEnvValue(process.env[key]).length > 0)
  if (foundSources.length === 0) {
    return `Falta configurar una clave OpenAI valida. Variables aceptadas: ${OPENAI_KEY_SOURCES.join(', ')}.`
  }

  return `La clave OpenAI configurada no tiene un formato valido. Variables revisadas: ${foundSources.join(', ')}.`
}
