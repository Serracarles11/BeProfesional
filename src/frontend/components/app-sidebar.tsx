"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  LayoutDashboard,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"

type ClubSidebarProps = {
  clubName: string
  clubHref: string
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

type NavItem = {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function AppSidebar({ clubName, clubHref }: ClubSidebarProps) {
  const pathname = usePathname()
  const [activeId, setActiveId] = React.useState("resumen")
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [notificationsLoading, setNotificationsLoading] = React.useState(true)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)

  React.useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace("#", "")
      setActiveId(
        pathname.endsWith("/entrenamientos")
          ? "entrenamientos"
          : pathname.endsWith("/jugadores")
            ? "jugadores"
            : hash || "home"
      )
    }

    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => window.removeEventListener("hashchange", syncHash)
  }, [pathname])

  React.useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notificaciones?limit=20", { cache: "no-store" })
        const data = (await response.json().catch(() => null)) as
          | {
              ok?: boolean
              notifications?: NotificationItem[]
              unreadCount?: number
            }
          | null

        if (!cancelled && response.ok && data?.ok) {
          setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
          setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0)
        }
      } catch (error) {
        console.error("No se pudieron cargar las notificaciones:", error)
      } finally {
        if (!cancelled) setNotificationsLoading(false)
      }
    }

    void loadNotifications()

    return () => {
      cancelled = true
    }
  }, [])

  const items: NavItem[] = [
    { id: "home", label: "Home", href: `${clubHref}#home`, icon: LayoutDashboard },
    { id: "equipos", label: "Equipos", href: `${clubHref}#equipos`, icon: Users },
    { id: "estadisticas", label: "Estadisticas", href: `${clubHref}#estadisticas`, icon: BarChart3 },
    { id: "partidos", label: "Partidos", href: `${clubHref}#partidos`, icon: CalendarDays },
    { id: "entrenamientos", label: "Entrenamientos", href: `${clubHref}/entrenamientos`, icon: CalendarDays },
    { id: "jugadores", label: "Jugadores", href: `${clubHref}/jugadores`, icon: UserRound },
    { id: "settings", label: "Settings", href: `${clubHref}#settings`, icon: Settings },
  ]

  const latestNotifications = notifications.slice(0, 2)

  const handleNavigate = (item: NavItem) => {
    setActiveId(item.id)

    const destination = new URL(item.href, window.location.origin)
    const currentPath = window.location.pathname.replace(/\/$/, "")
    const destinationPath = destination.pathname.replace(/\/$/, "")

    if (destination.hash && currentPath === destinationPath) {
      if (window.location.hash === destination.hash) {
        window.dispatchEvent(new HashChangeEvent("hashchange"))
      } else {
        window.location.hash = destination.hash.slice(1)
      }
      return
    }

    window.location.assign(destination.toString())
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

    fetch("/api/notificaciones", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationId: notification.id }),
    }).catch((error) => {
      console.error("No se pudo marcar la notificacion como leida:", error)
    })
  }

  const renderNotification = (notification: NotificationItem, compact = false) => {
    const content = (
      <>
        <div className="flex items-start justify-between gap-2">
          <p
            className={[
              "[font-family:var(--font-plus-jakarta)] font-extrabold text-[#181c20]",
              compact ? "text-xs" : "text-sm",
            ].join(" ")}
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
              "mt-1 font-medium text-[#5f6776]",
              compact ? "line-clamp-2 text-[11px] leading-4" : "text-xs leading-5",
            ].join(" ")}
          >
            {notification.mensaje}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa4b2]">
          {formatNotificationTime(notification.creado_en)}
        </p>
      </>
    )

    return (
      <button
        key={notification.id}
        type="button"
        onClick={() => markNotificationRead(notification)}
        className="block w-full rounded-xl border border-[#d9e4f7] bg-[#f8fbff] px-3 py-3 text-left transition hover:border-[#b9cff3] hover:bg-white"
      >
        {content}
      </button>
    )
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 shrink-0 border-r border-[#dfe3e8] bg-[#f4f7fc] p-4 xl:flex xl:flex-col">
        <div className="mb-5 px-2 py-4">
          <h2 className="[font-family:var(--font-plus-jakarta)] text-lg font-black text-[#00468c]">BeProfessional</h2>
          <p className="text-xs font-medium text-[#5f6776]">{clubName}</p>
        </div>

        <button
          type="button"
          onClick={() => window.location.assign("/equipos")}
          className="mb-3 flex w-full items-center gap-3 rounded-xl border border-[#d9e4f7] bg-white p-3 text-sm font-semibold text-[#00468c] transition hover:-translate-x-0.5 hover:border-[#b9cff3] hover:bg-[#f8fbff]"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
          <span className="[font-family:var(--font-plus-jakarta)]">Volver</span>
        </button>

        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = activeId === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item)}
                className={[
                  "flex w-full items-center gap-3 rounded-xl p-3 text-sm transition-transform duration-200 hover:translate-x-1",
                  active
                    ? "bg-[#d6e3ff] font-semibold text-[#00468c]"
                    : "text-[#5f6776] hover:text-[#005db6]",
                ].join(" ")}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="[font-family:var(--font-plus-jakarta)]">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setNotificationsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              setNotificationsOpen(true)
            }
          }}
          className="mt-auto flex h-[286px] cursor-pointer flex-col rounded-2xl border border-[#cddbf2] bg-white p-4 shadow-[0_18px_38px_rgba(0,93,182,0.08)] transition hover:-translate-y-0.5 hover:border-[#a9c4ef] hover:shadow-[0_22px_44px_rgba(0,93,182,0.12)]"
          aria-label="Abrir notificaciones"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6d7890]">
                Notificaciones
              </p>
              <p className="mt-1 [font-family:var(--font-plus-jakarta)] text-sm font-bold text-[#181c20]">
                {unreadCount > 0 ? `${unreadCount} sin leer` : "Al dia"}
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

      <nav className="fixed bottom-3 left-3 right-3 z-40 xl:hidden">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[#4a79df] bg-[#07205f]/90 p-2 backdrop-blur-xl sm:grid-cols-6">
          <button
            type="button"
            title="Volver"
            onClick={() => window.location.assign("/equipos")}
            className="flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] uppercase tracking-[0.12em] text-[#bcd0ff]"
          >
            <ArrowLeft className="mb-1 h-4 w-4" />
            <span className="truncate">Volver</span>
          </button>
          {items.map((item) => {
            const Icon = item.icon
            const active = activeId === item.id

            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => handleNavigate(item)}
                className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] uppercase tracking-[0.12em] ${
                  active ? "bg-[#5086F2] text-white" : "text-[#bcd0ff]"
                }`}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

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
