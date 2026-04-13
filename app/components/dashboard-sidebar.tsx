'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Dumbbell,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'

type DashboardSidebarProps = {
  equipoId?: string | null
}

type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  path?: string
  disabled?: boolean
}

function withEquipoQuery(basePath: string, equipoId: string | null) {
  if (!equipoId) return basePath
  return `${basePath}?equipo=${encodeURIComponent(equipoId)}`
}

function isItemActive(pathname: string, path?: string) {
  if (!path) return false
  if (pathname === path) return true
  return pathname.startsWith(`${path}/`)
}

function SidebarButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick?: () => void
}) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center justify-center transition ${
        item.disabled ? 'cursor-not-allowed opacity-45' : ''
      }`}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      disabled={item.disabled}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-[18px] border text-white transition md:h-14 md:w-14 ${
          active
            ? 'border-[#B3C5F5]/30 bg-[linear-gradient(180deg,#5086F2_0%,#0439D9_100%)] shadow-[0_16px_32px_rgba(4,57,217,0.35)]'
            : 'border-white/12 bg-white/8 text-[#DCE7FF] hover:border-[#5086F2]/30 hover:bg-white/14'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-white/14 bg-[#011140]/90 px-3 py-1 text-xs font-semibold text-white shadow-[0_16px_40px_rgba(1,17,64,0.28)] group-hover:block lg:block lg:opacity-0 lg:group-hover:opacity-100 lg:transition">
        {item.label}
      </span>
    </button>
  )
}

export default function DashboardSidebar({ equipoId }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTeamId = equipoId ?? searchParams.get('equipo')

  const items: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/home',
      href: withEquipoQuery('/home', activeTeamId),
    },
    {
      id: 'equipos',
      label: 'Equipos',
      icon: Users,
      path: '/equipos',
      href: '/equipos',
    },
    {
      id: 'training',
      label: 'Entrenamiento',
      icon: Dumbbell,
      path: '/entrenamientos',
      href: withEquipoQuery('/entrenamientos', activeTeamId),
    },
    {
      id: 'partidos',
      label: 'Trofeos',
      icon: Trophy,
      path: '/partidos',
      href: withEquipoQuery('/partidos', activeTeamId),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      path: '/chat',
      href: withEquipoQuery('/chat', activeTeamId),
    },
    {
      id: 'play-maker',
      label: 'Play Maker',
      icon: Sparkles,
      path: '/play-maker',
      href: withEquipoQuery('/play-maker', activeTeamId),
    },
    {
      id: 'settings',
      label: 'Ajustes',
      icon: Settings,
      path: '/settings',
      href: withEquipoQuery('/settings', activeTeamId),
    },
  ]

  return (
    <>
      <aside className="bp-sidebar-shell sticky top-4 hidden h-[calc(100vh-2rem)] items-center justify-center rounded-[30px] px-3 py-4 lg:flex">
        <nav className="flex h-full flex-col items-center justify-between">
          <div className="flex flex-col items-center gap-4">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/16 bg-white/10 text-sm font-semibold uppercase tracking-[0.24em] text-white">
              BP
            </div>
            {items.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                active={isItemActive(pathname, item.path)}
                onClick={item.href && !item.disabled ? () => router.push(item.href as string) : undefined}
              />
            ))}
          </div>

          <div className="rounded-[22px] border border-white/12 bg-white/8 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[#DCE7FF]">
            Activo
          </div>
        </nav>
      </aside>

      <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <div className="flex items-center justify-between rounded-[28px] border border-white/14 bg-[rgba(1,17,64,0.88)] px-3 py-3 shadow-[0_24px_60px_rgba(1,17,64,0.32)] backdrop-blur-xl">
          {items.map((item) => {
            const Icon = item.icon
            const active = isItemActive(pathname, item.path)

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.href && !item.disabled ? () => router.push(item.href as string) : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                  active
                    ? 'bg-[linear-gradient(180deg,#5086F2_0%,#0439D9_100%)] text-white shadow-[0_10px_24px_rgba(4,57,217,0.35)]'
                    : 'text-[#B3C5F5]'
                } ${item.disabled ? 'opacity-45' : ''}`}
                title={item.label}
                disabled={item.disabled}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
