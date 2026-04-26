'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bell,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { isActivePath, withEquipo } from '../utils'

type LeftNavigationProps = {
  equipoId?: string
  teamName: string
  isCoach?: boolean
  isCodesActive?: boolean
  onOpenCodes?: () => void
  isSettingsActive?: boolean
  onOpenSettings?: () => void
}

type NotificationItem = {
  id: string
  tipo: string
  titulo: string
  mensaje: string | null
  enlace: string | null
  leida: boolean
  creado_en: string
}

const MENU_ITEMS = [
  { label: 'Home', href: '/home', icon: LayoutDashboard },
  { label: 'Players', href: '/jugadores', icon: Users },
  { label: 'Partidos', href: '/partidos', icon: CalendarDays },
  { label: 'Chats', href: '/chat', icon: MessageSquare },
  { label: 'Estadisticas', href: '/estadisticas', icon: BarChart3 },
  { label: 'AI Coach', href: '/play-maker', icon: Sparkles },
]

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function LeftNavigation({
  equipoId,
  teamName,
  isCoach = false,
  isCodesActive = false,
  onOpenCodes,
  isSettingsActive = false,
  onOpenSettings,
}: LeftNavigationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const playMakerMode = searchParams.get('mode')
  const menuItems = isCoach
    ? [
        ...MENU_ITEMS,
        { label: 'IA Maker', href: '/play-maker?mode=maker', icon: Sparkles },
      ]
    : MENU_ITEMS

  useEffect(() => {
    let cancelled = false

    async function loadNotifications(showLoading = false) {
      try {
        if (showLoading) setNotificationsLoading(true)
        const response = await fetch('/api/notificaciones?limit=20', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as
          | {
              ok?: boolean
              notifications?: NotificationItem[]
              unreadCount?: number
            }
          | null

        if (!cancelled && response.ok && data?.ok) {
          setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
        }
      } catch (error) {
        console.error('No se pudieron cargar las notificaciones:', error)
      } finally {
        if (!cancelled) setNotificationsLoading(false)
      }
    }

    loadNotifications(true)

    let supabase: ReturnType<typeof createSupabaseBrowser> | null = null
    try {
      supabase = createSupabaseBrowser()
    } catch (error) {
      console.error('No se pudo iniciar realtime de notificaciones:', error)
      return () => {
        cancelled = true
      }
    }

    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user?.id) return

      channel = supabase
        .channel(`notificaciones:${data.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificaciones',
            filter: `usuario_id=eq.${data.user.id}`,
          },
          () => {
            loadNotifications(false)
          }
        )
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const latestNotifications = notifications.slice(0, 2)

  const openNotifications = () => {
    setNotificationsOpen(true)
  }

  const handleNotificationsCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openNotifications()
    }
  }

  const markNotificationRead = (notification: NotificationItem) => {
    if (notification.leida) return

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              leida: true,
            }
          : item
      )
    )
    setUnreadCount((current) => Math.max(current - 1, 0))

    fetch('/api/notificaciones', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId: notification.id }),
    }).catch((error) => {
      console.error('No se pudo marcar la notificacion como leida:', error)
    })
  }

  const handleNotificationKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    notification: NotificationItem
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    markNotificationRead(notification)
  }

  const renderNotification = (notification: NotificationItem, compact = false) => {
    const content = (
      <>
        <div className="flex items-start justify-between gap-2">
          <p
            className={[
              '[font-family:var(--font-plus-jakarta)] font-extrabold text-[#181c20]',
              compact ? 'text-xs' : 'text-sm',
            ].join(' ')}
          >
            {notification.titulo}
          </p>
          {!notification.leida ? (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#005db6]" />
          ) : null}
        </div>
        {notification.mensaje ? (
          <p
            className={[
              'mt-1 font-medium text-[#5f6776]',
              compact ? 'line-clamp-2 text-[11px] leading-4' : 'text-xs leading-5',
            ].join(' ')}
          >
            {notification.mensaje}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa4b2]">
          {formatNotificationTime(notification.creado_en)}
        </p>
      </>
    )

    if (notification.enlace) {
      return (
        <Link
          key={notification.id}
          href={notification.enlace}
          onClick={(event) => {
            event.stopPropagation()
            markNotificationRead(notification)
            setNotificationsOpen(false)
          }}
          className="block rounded-xl border border-[#d9e4f7] bg-[#f8fbff] px-3 py-3 transition hover:border-[#b9cff3] hover:bg-white"
        >
          {content}
        </Link>
      )
    }

    return (
      <div
        key={notification.id}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation()
          markNotificationRead(notification)
        }}
        onKeyDown={(event) => handleNotificationKeyDown(event, notification)}
        className="cursor-pointer rounded-xl border border-[#d9e4f7] bg-[#f8fbff] px-3 py-3 transition hover:border-[#b9cff3] hover:bg-white"
      >
        {content}
      </div>
    )
  }

  return (
    <>
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 shrink-0 border-r border-[#dfe3e8] bg-[#f4f7fc] p-4 xl:flex xl:flex-col">
      <div className="mb-5 px-2 py-4">
        <h2 className="[font-family:var(--font-plus-jakarta)] text-lg font-black text-[#00468c]">BeProfessional</h2>
        <p className="text-xs font-medium text-[#5f6776]">{teamName}</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const isMakerItem = item.href.includes('mode=maker')
          const active = isMakerItem
            ? pathname === '/play-maker' && playMakerMode === 'maker'
            : item.href === '/play-maker'
              ? isActivePath(pathname, item.href) && playMakerMode !== 'maker'
              : isActivePath(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={withEquipo(item.href, equipoId)}
              className={[
                'flex items-center gap-3 rounded-xl p-3 text-sm transition-transform duration-200 hover:translate-x-1',
                active
                  ? 'bg-[#d6e3ff] font-semibold text-[#00468c]'
                  : 'text-[#5f6776] hover:text-[#005db6]',
              ].join(' ')}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span className="[font-family:var(--font-plus-jakarta)]">{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={onOpenCodes}
          className={[
            'flex w-full items-center gap-3 rounded-xl p-3 text-sm transition-transform duration-200 hover:translate-x-1',
            isCodesActive
              ? 'bg-[#d6e3ff] font-semibold text-[#00468c]'
              : 'text-[#5f6776] hover:text-[#005db6]',
          ].join(' ')}
        >
          <KeyRound className="h-[18px] w-[18px]" strokeWidth={1.8} />
          <span className="[font-family:var(--font-plus-jakarta)]">Codigos</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className={[
            'flex w-full items-center gap-3 rounded-xl p-3 text-sm transition-transform duration-200 hover:translate-x-1',
            isSettingsActive
              ? 'bg-[#d6e3ff] font-semibold text-[#00468c]'
              : 'text-[#5f6776] hover:text-[#005db6]',
          ].join(' ')}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
          <span className="[font-family:var(--font-plus-jakarta)]">Settings</span>
        </button>
      </nav>

      <div
        role="button"
        tabIndex={0}
        onClick={openNotifications}
        onKeyDown={handleNotificationsCardKeyDown}
        className="mt-auto flex h-[286px] cursor-pointer flex-col rounded-2xl border border-[#cddbf2] bg-white p-4 shadow-[0_18px_38px_rgba(0,93,182,0.08)] transition hover:-translate-y-0.5 hover:border-[#a9c4ef] hover:shadow-[0_22px_44px_rgba(0,93,182,0.12)]"
        aria-label="Abrir notificaciones"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6d7890]">
              Notificaciones
            </p>
            <p className="mt-1 [font-family:var(--font-plus-jakarta)] text-sm font-bold text-[#181c20]">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Al dia'}
            </p>
          </div>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#005db6]">
            <Bell className="h-4 w-4" strokeWidth={1.9} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#ffb020]" />
            ) : null}
          </span>
        </div>

        {notificationsLoading ? (
          <div className="flex flex-1 items-center rounded-xl border border-dashed border-[#d9e4f7] bg-[#f8fbff] px-3 py-3">
            <p className="text-xs font-semibold text-[#5f6776]">Cargando avisos...</p>
          </div>
        ) : latestNotifications.length > 0 ? (
          <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
            {latestNotifications.map((notification) => renderNotification(notification, true))}
          </div>
        ) : (
          <div className="flex flex-1 items-center rounded-xl border border-dashed border-[#d9e4f7] bg-[#f8fbff] px-3 py-3">
            <p className="text-xs font-semibold text-[#5f6776]">No tienes avisos pendientes.</p>
          </div>
        )}
      </div>
    </aside>
    <div className="hidden w-64 shrink-0 xl:block" aria-hidden="true" />
    {notificationsOpen ? (
      <div className="fixed inset-0 z-50 hidden items-center justify-center bg-[#08111f]/35 px-6 backdrop-blur-sm xl:flex">
        <div className="w-full max-w-lg rounded-[28px] border border-[#d9e4f7] bg-white p-5 shadow-[0_30px_90px_rgba(8,17,31,0.24)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#005db6]">
                Centro de avisos
              </p>
              <h2 className="mt-1 [font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
                Notificaciones
              </h2>
              <p className="mt-1 text-sm font-medium text-[#6b7280]">
                Revisa los ultimos cambios del equipo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f5f9] text-[#334155] transition hover:bg-[#e2e8f0]"
              aria-label="Cerrar notificaciones"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {notificationsLoading ? (
              <div className="rounded-2xl border border-dashed border-[#d9e4f7] bg-[#f8fbff] px-4 py-5">
                <p className="text-sm font-semibold text-[#5f6776]">Cargando avisos...</p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => renderNotification(notification))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d9e4f7] bg-[#f8fbff] px-4 py-5">
                <p className="text-sm font-semibold text-[#5f6776]">
                  No tienes notificaciones todavia.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null}
    </>
  )
}
