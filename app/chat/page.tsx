'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Mic, PlusCircle, Search, Send, Smile } from 'lucide-react'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'

type ChatChannel = {
  id: string
  kind: 'team' | 'private' | 'ai'
  label: string
  canSend: boolean
}

type ChatMessage = {
  id: string
  content: string
  createdAt: string
  senderId: string
  senderName: string
  isMine: boolean
}

type BootstrapResponse =
  | {
      ok: true
      equipoId: string | null
      teamName: string | null
      role: string | null
      isCoach: boolean
      channels: ChatChannel[]
      activeChatId: string | null
    }
  | {
      ok: false
      error: string
    }

type MessagesResponse =
  | {
      ok: true
      chatId: string | null
      canSend: boolean
      messages: ChatMessage[]
    }
  | {
      ok: false
      error: string
    }

type SendMessageResponse =
  | {
      ok: true
      message: ChatMessage
    }
  | {
      ok: false
      error: string
    }

type ChannelPreview = {
  text: string
  at: string | null
}

function formatMessageHour(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatConversationDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDays = Math.floor((today - target) / 86400000)

  if (diffDays <= 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (words.length === 0) return 'CH'
  return words.map((word) => word[0]?.toUpperCase() ?? '').join('')
}

function buildDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function renderMessageContent(content: string) {
  const urlPattern = /(https?:\/\/[^\s]+|\/[A-Za-z0-9/_?=&.%:-]+)/g
  const lines = content.split('\n')

  return lines.map((line, lineIndex) => {
    const parts: ReactNode[] = []
    let lastIndex = 0

    for (const match of line.matchAll(urlPattern)) {
      const url = match[0]
      const index = match.index ?? 0
      if (index > lastIndex) {
        parts.push(line.slice(lastIndex, index))
      }
      parts.push(
        <a
          key={`${lineIndex}-${index}-${url}`}
          href={url}
          className="font-extrabold underline decoration-2 underline-offset-4"
        >
          Abrir enlace
        </a>
      )
      lastIndex = index + url.length
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex))
    }

    return (
      <span key={`line-${lineIndex}`}>
        {parts.length > 0 ? parts : line}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    )
  })
}

function ChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTeamId = searchParams.get('equipo')
  const requestedChatId = searchParams.get('chatId')

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [teamId, setTeamId] = useState<string | null>(requestedTeamId)
  const [teamName, setTeamName] = useState('Equipo')
  const [isCoach, setIsCoach] = useState(false)
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [canSend, setCanSend] = useState(false)
  const [input, setInput] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [channelSearch, setChannelSearch] = useState('')
  const [channelPreviews, setChannelPreviews] = useState<Record<string, ChannelPreview>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedChatIdRef = useRef<string | null>(null)

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChatId) ?? null,
    [channels, selectedChatId]
  )

  const filteredChannels = useMemo(() => {
    const search = channelSearch.trim().toLowerCase()
    if (!search) return channels
    return channels.filter((channel) => channel.label.toLowerCase().includes(search))
  }, [channels, channelSearch])

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId
  }, [selectedChatId])

  const loadMessages = useCallback(async (chatId: string, silent = false, previewOnly = false) => {
    if (!chatId) return
    if (!silent) setIsLoadingMessages(true)

    try {
      const response = await fetch(`/api/chat/mensajes?chatId=${encodeURIComponent(chatId)}`, {
        cache: 'no-store',
      })
      const data = (await response.json()) as MessagesResponse

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'No se pudo cargar el chat.' : data.error)
      }

      if (!previewOnly && selectedChatIdRef.current === chatId) {
        setMessages(data.messages)
        setCanSend(data.canSend)
      }

      const lastMessage = data.messages[data.messages.length - 1]
      setChannelPreviews((current) => ({
        ...current,
        [chatId]: {
          text: lastMessage?.content || 'Sin mensajes',
          at: lastMessage?.createdAt ?? null,
        },
      }))
    } catch (loadError) {
      if (!silent) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el chat.')
      }
    } finally {
      if (!silent) setIsLoadingMessages(false)
    }
  }, [])

  const loadChannelPreviews = useCallback(async (chatIds: string[], activeChatId: string | null) => {
    const uniqueChatIds = Array.from(new Set(chatIds)).filter((chatId) => chatId !== activeChatId)
    await Promise.all(uniqueChatIds.map((chatId) => loadMessages(chatId, true, true)))
  }, [loadMessages])

  const loadBootstrap = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const params = new URLSearchParams()
      if (requestedTeamId) params.set('equipo', requestedTeamId)
      if (requestedChatId) params.set('chatId', requestedChatId)

      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await fetch(`/api/chat${query}`, { cache: 'no-store' })
      const data = (await response.json()) as BootstrapResponse

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'No se pudo cargar el chat.' : data.error)
      }

      setTeamId(data.equipoId)
      setTeamName(data.teamName || 'Equipo')
      setIsCoach(data.isCoach)
      setChannels(data.channels)
      setSelectedChatId(data.activeChatId)
      selectedChatIdRef.current = data.activeChatId
      setCanSend(
        data.channels.find((channel) => channel.id === data.activeChatId)?.canSend ?? false
      )
      setStatus('ready')

      if (data.activeChatId) {
        await loadMessages(data.activeChatId)
      } else {
        setMessages([])
        setCanSend(false)
      }

      void loadChannelPreviews(
        data.channels.map((channel) => channel.id),
        data.activeChatId
      )
    } catch (loadError) {
      setStatus('error')
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el chat.')
    }
  }, [loadChannelPreviews, loadMessages, requestedChatId, requestedTeamId])

  useEffect(() => {
    void loadBootstrap()
  }, [loadBootstrap])

  useEffect(() => {
    if (!selectedChatId) return
    const timer = window.setInterval(() => {
      void loadMessages(selectedChatId, true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [loadMessages, selectedChatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectChannel = async (chatId: string) => {
    setSelectedChatId(chatId)
    selectedChatIdRef.current = chatId
    setMessages([])
    setCanSend(channels.find((channel) => channel.id === chatId)?.canSend ?? false)
    setError('')
    await loadMessages(chatId)
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || !selectedChatId || !canSend || isSending) return

    const tempId = `tmp-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content: trimmed,
      createdAt: new Date().toISOString(),
      senderId: 'me',
      senderName: 'Tu',
      isMine: true,
    }

    setMessages((current) => [...current, optimisticMessage])
    setInput('')
    setIsSending(true)
    setError('')

    try {
      const response = await fetch('/api/chat/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChatId,
          text: trimmed,
        }),
      })

      const data = (await response.json()) as SendMessageResponse
      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'No se pudo enviar el mensaje.' : data.error)
      }

      setMessages((current) =>
        current.map((message) => (message.id === tempId ? data.message : message))
      )

      setChannelPreviews((current) => ({
        ...current,
        [selectedChatId]: {
          text: data.message.content,
          at: data.message.createdAt,
        },
      }))
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== tempId))
      setError(sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje.')
    } finally {
      setIsSending(false)
    }
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f7f9fe] px-4 py-10">
        <p className="text-sm font-semibold text-[#4d5b74]">Cargando chat...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#f7f9fe] px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadBootstrap()}
            className="mt-3 rounded-lg bg-[#005db6] px-3 py-2 text-xs font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  let lastDateLabel = ''

  return (
    <div className="h-screen overflow-hidden bg-[#f7f9fe] text-[#181c20]">
      <main className="mx-auto flex h-full w-full max-w-[1700px]">
        <LeftNavigation equipoId={teamId ?? undefined} teamName={teamName} isCoach={isCoach} />

        <section className="flex min-w-0 flex-1 overflow-hidden">
          <div className="hidden w-[360px] shrink-0 border-r border-[#dfe3e8] bg-[#f7f9fe] md:flex md:flex-col">
            <div className="p-6">
              <h1 className="[font-family:var(--font-plus-jakarta)] text-2xl font-extrabold tracking-tight text-[#005db6]">
                Messages
              </h1>
              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727785]" />
                <input
                  value={channelSearch}
                  onChange={(event) => setChannelSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-xl border-0 bg-[#f1f4f9] py-3 pl-11 pr-4 text-sm text-[#181c20] outline-none ring-2 ring-transparent transition focus:ring-[#005db6]/20"
                />
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
              {filteredChannels.map((channel) => {
                const active = channel.id === selectedChatId
                const preview = channelPreviews[channel.id]
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => void selectChannel(channel.id)}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all',
                      active
                        ? 'bg-gradient-to-br from-[#005db6] to-[#3176d2] text-white shadow-lg shadow-blue-500/20'
                        : 'hover:bg-[#f1f4f9]',
                    ].join(' ')}
                  >
                    <div className="relative h-12 w-12 shrink-0 rounded-full bg-[#d6e3ff]">
                      <div
                        className={[
                          'flex h-full w-full items-center justify-center rounded-full text-xs font-bold',
                          active ? 'bg-white/20 text-white' : 'text-[#00468c]',
                        ].join(' ')}
                      >
                        {getInitials(channel.label)}
                      </div>
                      <span
                        className={[
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2',
                          active ? 'border-[#3176d2] bg-[#ffe170]' : 'border-white bg-[#a9c7ff]',
                        ].join(' ')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold">{channel.label}</span>
                        <span className={active ? 'text-[10px] font-bold uppercase tracking-widest text-white/80' : 'text-[10px] font-bold uppercase tracking-widest text-[#727785]'}>
                          {formatConversationDate(preview?.at ?? null)}
                        </span>
                      </div>
                      <p className={active ? 'mt-0.5 truncate text-xs text-white/90' : 'mt-0.5 truncate text-xs text-[#414754]'}>
                        {preview?.text || 'Sin mensajes todavía'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#dfe3e8] bg-white/90 px-5 backdrop-blur-md md:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    router.push(teamId ? `/home?equipo=${encodeURIComponent(teamId)}` : '/home')
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#414754] transition hover:bg-[#f1f4f9]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="relative h-10 w-10 rounded-full bg-[#d6e3ff]">
                  <div className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-[#00468c]">
                    {getInitials(activeChannel?.label ?? 'Chat')}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#ffe170]" />
                </div>
                <div>
                  <h2 className="[font-family:var(--font-plus-jakarta)] text-base font-bold text-[#181c20]">
                    {activeChannel?.label ?? 'Chat'}
                  </h2>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#005db6]">
                    {activeChannel?.kind === 'private'
                      ? 'PRIVADO'
                      : activeChannel?.kind === 'ai'
                        ? 'IA'
                        : 'EQUIPO'}
                  </p>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              {isLoadingMessages && messages.length === 0 ? (
                <p className="text-sm text-[#727785]">Cargando mensajes...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-[#727785]">No hay mensajes en este canal.</p>
              ) : (
                messages.map((message) => {
                  const label = buildDateLabel(message.createdAt)
                  const showDate = label && label !== lastDateLabel
                  if (showDate) lastDateLabel = label

                  return (
                    <div key={message.id} className="space-y-2">
                      {showDate && (
                        <div className="flex justify-center">
                          <span className="rounded-full bg-[#f1f4f9] px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#727785]">
                            {label}
                          </span>
                        </div>
                      )}
                      <div className={message.isMine ? 'flex justify-end' : 'flex justify-start'}>
                        <div className="max-w-[84%] space-y-1">
                          {!message.isMine && (
                            <p className="ml-2 text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                              {message.senderName}
                            </p>
                          )}
                          <div
                            className={[
                              'rounded-2xl px-5 py-3.5 text-sm font-medium leading-relaxed shadow-sm',
                              message.isMine
                                ? 'rounded-br-none bg-gradient-to-br from-[#005db6] to-[#3176d2] text-white shadow-blue-500/20'
                                : 'rounded-bl-none bg-[#e5e8ed] text-[#181c20]',
                            ].join(' ')}
                          >
                            {renderMessageContent(message.content)}
                          </div>
                          <p className={message.isMine ? 'mr-2 text-right text-[10px] font-bold text-[#727785]' : 'ml-2 text-[10px] font-bold text-[#727785]'}>
                            {formatMessageHour(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-[#dfe3e8] bg-white/90 p-4 backdrop-blur-md md:p-6">
              {!canSend ? (
                <p className="text-xs font-semibold text-[#727785]">
                  No puedes enviar mensajes en este chat.
                </p>
              ) : (
                <div className="flex items-end gap-3 rounded-2xl border border-[#c1c6d6]/20 bg-[#f1f4f9] p-2">
                  <div className="hidden items-center gap-1 pb-1 sm:flex">
                    <button className="rounded-xl p-2.5 text-[#414754] transition hover:bg-white/60 hover:text-[#005db6]" type="button">
                      <PlusCircle className="h-4 w-4" />
                    </button>
                    <button className="rounded-xl p-2.5 text-[#414754] transition hover:bg-white/60 hover:text-[#005db6]" type="button">
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={`Escribe tu mensaje para ${activeChannel?.label ?? 'el equipo'}...`}
                    rows={1}
                    className="min-h-[44px] max-h-32 flex-1 resize-y bg-transparent py-3 text-sm text-[#181c20] outline-none"
                  />
                  <div className="flex items-center gap-2 pb-1">
                    <button className="rounded-xl p-2.5 text-[#414754] transition hover:bg-white/60 hover:text-[#005db6]" type="button">
                      <Mic className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={isSending || input.trim().length === 0}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#005db6] to-[#3176d2] text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </footer>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#f7f9fe]" />}>
      <ChatPageContent />
    </Suspense>
  )
}
