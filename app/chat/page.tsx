'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bookmark, BookmarkCheck, Bot, Send } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

type SavedMessage = Message & {
  savedAt: string
}

type BootstrapResponse =
  | {
      ok: true
      chatId: string | null
      equipoId: string | null
    }
  | {
      ok: false
      error: string
    }

type MensajesResponse =
  | {
      ok: true
      chatId: string | null
      messages: Message[]
    }
  | {
      ok: false
      error: string
    }

type GuardadosResponse =
  | {
      ok: true
      chatId: string | null
      savedMessageIds: string[]
      savedMessages: SavedMessage[]
    }
  | {
      ok: false
      error: string
    }

type PersistMessageResponse =
  | {
      ok: true
      message: Message
    }
  | {
      ok: false
      error: string
    }

type AssistantResponse =
  | {
      ok: true
      message: string
    }
  | {
      ok: false
      error: string
    }

const LOCAL_WELCOME_ID = 'welcome-local'

const WELCOME_MESSAGE: Message = {
  id: LOCAL_WELCOME_ID,
  role: 'assistant',
  content:
    'Hola! Soy tu asistente deportivo con IA. Puedo ayudarte con tacticas, analisis de partidos y planificacion de entrenamientos. Que necesitas hoy?',
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function withWelcome(messages: Message[]) {
  return messages.length > 0 ? messages : [WELCOME_MESSAGE]
}

function toSnippet(content: string, maxLength = 90) {
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength).trim()}...`
}

function isPersistedMessageId(messageId: string) {
  return UUID_PATTERN.test(messageId)
}

function ChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedChatId = searchParams.get('chatId')

  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootError, setBootError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadChat = useCallback(async () => {
    setIsBootstrapping(true)
    setBootError('')

    try {
      const query = requestedChatId ? `?chatId=${encodeURIComponent(requestedChatId)}` : ''
      const bootstrapResponse = await fetch(`/api/chat${query}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const bootstrapData = (await bootstrapResponse.json()) as BootstrapResponse

      if (!bootstrapResponse.ok || !bootstrapData.ok) {
        throw new Error(bootstrapData.ok ? 'No se pudo preparar el chat.' : bootstrapData.error)
      }

      setChatId(bootstrapData.chatId)
      if (!bootstrapData.chatId) {
        setMessages([])
        setSavedMessages([])
        return
      }

      const chatIdQuery = encodeURIComponent(bootstrapData.chatId)
      const [messagesResponse, savedResponse] = await Promise.all([
        fetch(`/api/chat/mensajes?chatId=${chatIdQuery}`, { cache: 'no-store' }),
        fetch(`/api/chat/guardados?chatId=${chatIdQuery}`, { cache: 'no-store' }),
      ])

      const messagesData = (await messagesResponse.json()) as MensajesResponse
      const savedData = (await savedResponse.json()) as GuardadosResponse

      if (!messagesResponse.ok || !messagesData.ok) {
        throw new Error(messagesData.ok ? 'No se pudo cargar el historial.' : messagesData.error)
      }

      if (!savedResponse.ok || !savedData.ok) {
        throw new Error(savedData.ok ? 'No se pudieron cargar los mensajes guardados.' : savedData.error)
      }

      setMessages(withWelcome(messagesData.messages))
      setSavedMessages(savedData.savedMessages)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el historial del chat.'

      setBootError(message)
      setMessages([WELCOME_MESSAGE])
      setSavedMessages([])
    } finally {
      setIsBootstrapping(false)
    }
  }, [requestedChatId])

  useEffect(() => {
    void loadChat()
  }, [loadChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const savedMessageIds = useMemo(() => {
    return new Set(savedMessages.map((message) => message.id))
  }, [savedMessages])

  const scrollToMessage = useCallback((messageId: string) => {
    const target = document.getElementById(`message-${messageId}`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const toggleSavedMessage = useCallback(
    async (message: Message) => {
      if (!isPersistedMessageId(message.id)) return

      const exists = savedMessageIds.has(message.id)
      const previous = savedMessages
      const optimistic = exists
        ? previous.filter((item) => item.id !== message.id)
        : [{ ...message, savedAt: new Date().toISOString() }, ...previous]

      setSavedMessages(optimistic)

      try {
        const endpoint = exists
          ? `/api/chat/guardados?mensajeId=${encodeURIComponent(message.id)}`
          : '/api/chat/guardados'

        const response = await fetch(endpoint, {
          method: exists ? 'DELETE' : 'POST',
          headers: exists ? undefined : { 'Content-Type': 'application/json' },
          body: exists ? undefined : JSON.stringify({ mensajeId: message.id }),
        })

        const data = (await response.json()) as { ok?: boolean; error?: string }

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'No se pudo actualizar el mensaje guardado.')
        }
      } catch (error) {
        setSavedMessages(previous)
        setBootError(
          error instanceof Error ? error.message : 'No se pudo actualizar el mensaje guardado.'
        )
      }
    },
    [savedMessageIds, savedMessages]
  )

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || isBootstrapping) return

    if (!chatId) {
      setBootError('Selecciona un chat.')
      return
    }

    const tempId = `temp-user-${Date.now()}`
    const contextMessages = [
      ...messages
        .filter((message) => message.id !== LOCAL_WELCOME_ID)
        .map((message) => ({ role: message.role, content: message.content })),
      { role: 'user' as const, content: trimmed },
    ].slice(-20)

    setMessages((prev) => {
      const withoutWelcome = prev.filter((item) => item.id !== LOCAL_WELCOME_ID)
      return [...withoutWelcome, { id: tempId, role: 'user', content: trimmed }]
    })

    setInput('')
    setIsLoading(true)
    setBootError('')

    try {
      const persistUserResponse = await fetch('/api/chat/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          role: 'user',
          text: trimmed,
        }),
      })

      const persistUserData = (await persistUserResponse.json()) as PersistMessageResponse

      if (!persistUserResponse.ok || !persistUserData.ok) {
        throw new Error(persistUserData.ok ? 'No se pudo guardar tu mensaje.' : persistUserData.error)
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempId ? persistUserData.message : message
        )
      )

      const assistantResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: contextMessages }),
      })

      const assistantData = (await assistantResponse.json()) as AssistantResponse

      if (!assistantResponse.ok || !assistantData.ok) {
        throw new Error(
          assistantData.ok
            ? 'No se pudo obtener respuesta del asistente.'
            : assistantData.error
        )
      }

      const assistantText = assistantData.message.trim()

      const persistAssistantResponse = await fetch('/api/chat/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          role: 'assistant',
          text: assistantText,
        }),
      })

      const persistAssistantData = (await persistAssistantResponse.json()) as PersistMessageResponse

      if (!persistAssistantResponse.ok || !persistAssistantData.ok) {
        throw new Error(
          persistAssistantData.ok
            ? 'No se pudo guardar la respuesta del asistente.'
            : persistAssistantData.error
        )
      }

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== tempId),
        persistAssistantData.message,
      ])
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : 'Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo.'

      setBootError(errorText)

      setMessages((prev) => {
        const withoutTemp = prev.filter((message) => message.id !== tempId)
        return [
          ...withoutTemp,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: errorText,
          },
        ]
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [chatId, input, isBootstrapping, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="chat-bg h-screen p-3 md:p-4">
      <div className="mx-auto flex h-full max-w-6xl gap-3">
        <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-3xl border border-gray-200/60 bg-white/70 p-4 backdrop-blur-xl md:flex">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Chat</p>
            <h2 className="text-lg font-bold text-gray-800">Mensajes guardados</h2>
            <p className="text-xs text-gray-500">{savedMessages.length} mensajes</p>
          </div>

          <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
            {savedMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-3 text-sm text-gray-500">
                Guarda mensajes desde la conversacion para verlos aqui.
              </div>
            ) : (
              savedMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => scrollToMessage(message.id)}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 p-3 text-left transition hover:border-indigo-300 hover:bg-white"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {message.role === 'assistant' ? 'Asistente' : 'Tu'}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{toSnippet(message.content)}</p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {new Date(message.savedAt).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200/60 bg-white/40 backdrop-blur-xl">
          <header className="chat-header shrink-0 border-b border-gray-200/50 px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/home')}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-gray-600 transition hover:bg-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-800">AI Assistant</h1>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Powered by GPT
                  </p>
                </div>
              </div>
            </div>
          </header>

          {bootError && (
            <div className="shrink-0 border-b border-red-200 bg-red-50/90 px-4 py-2 text-xs text-red-700">
              {bootError}
            </div>
          )}

          <div className="shrink-0 border-b border-gray-200/50 px-4 py-2 md:hidden">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Mensajes guardados</span>
              <span>{savedMessages.length}</span>
            </div>
            {savedMessages.length > 0 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {savedMessages.slice(0, 8).map((message) => (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => scrollToMessage(message.id)}
                    className="min-w-52 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-left text-xs text-gray-600"
                  >
                    <span className="font-semibold text-gray-700">{message.role === 'assistant' ? 'Asistente' : 'Tu'}: </span>
                    {toSnippet(message.content, 48)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400">Todavia no has guardado mensajes.</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto max-w-3xl space-y-4">
              {isBootstrapping ? (
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-500">
                  Cargando historial del chat...
                </div>
              ) : !chatId ? (
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-500">
                  Selecciona un chat.
                </div>
              ) : (
                messages.map((message) => {
                  const isSaved = savedMessageIds.has(message.id)
                  const canSave = isPersistedMessageId(message.id)

                  return (
                    <div
                      id={`message-${message.id}`}
                      key={message.id}
                      className={`group flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`flex max-w-[86%] items-start gap-2 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            message.role === 'user'
                              ? 'chat-bubble-user rounded-tr-sm bg-gradient-to-r from-indigo-500 to-violet-600 text-white'
                              : 'chat-bubble-assistant rounded-tl-sm bg-white/80 text-gray-700 shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleSavedMessage(message)}
                          disabled={!canSave}
                          className="mt-1 rounded-lg bg-white/85 p-1.5 text-gray-500 opacity-100 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100"
                          title={isSaved ? 'Quitar de guardados' : 'Guardar mensaje'}
                        >
                          {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white/80 px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="chat-typing-dot h-2 w-2 rounded-full bg-gray-400" />
                      <span className="chat-typing-dot h-2 w-2 rounded-full bg-gray-400" style={{ animationDelay: '0.2s' }} />
                      <span className="chat-typing-dot h-2 w-2 rounded-full bg-gray-400" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="chat-input-area shrink-0 border-t border-gray-200/50 px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje..."
                  rows={1}
                  disabled={isLoading || isBootstrapping || !chatId}
                  className="chat-input w-full resize-none rounded-2xl border-2 border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition focus:border-indigo-400 focus:outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading || isBootstrapping || !chatId}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm transition hover:shadow-md disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatPageFallback() {
  return (
    <div className="chat-bg h-screen p-3 md:p-4">
      <div className="mx-auto flex h-full max-w-6xl gap-3">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200/60 bg-white/40 backdrop-blur-xl">
          <div className="flex-1 px-4 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-500">
                Cargando historial del chat...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatPageContent />
    </Suspense>
  )
}
