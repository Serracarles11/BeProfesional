'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
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

const MENU_ITEMS = [
  { label: 'Home', href: '/home', icon: LayoutDashboard },
  { label: 'Players', href: '/jugadores', icon: Users },
  { label: 'Matches', href: '/partidos', icon: CalendarDays },
  { label: 'Chats', href: '/chat', icon: MessageSquare },
  { label: 'Reports', href: '/estadisticas', icon: BarChart3 },
  { label: 'AI Coach', href: '/play-maker', icon: Sparkles },
]

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
  const menuItems = MENU_ITEMS.map((item) =>
    item.href === '/play-maker' ? { ...item, label: isCoach ? 'IA Maker' : 'AI Coach' } : item
  )

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-[#dfe3e8] bg-[#f4f7fc] p-4 xl:flex xl:flex-col">
      <div className="mb-5 px-2 py-4">
        <h2 className="[font-family:var(--font-plus-jakarta)] text-lg font-black text-[#00468c]">Elite Performance</h2>
        <p className="text-xs font-medium text-[#5f6776]">{teamName}</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const active = isActivePath(pathname, item.href)
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

      <div className="mt-auto rounded-2xl bg-[#005db6] p-4 text-white">
        <p className="mb-1 text-[10px] font-semibold tracking-[0.18em] text-white/75">DIRECT ACCESS</p>
        <p className="mb-3 [font-family:var(--font-plus-jakarta)] text-sm font-bold">Team Hub</p>
        <Link
          href={withEquipo('/chat', equipoId)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-xs font-bold transition hover:bg-white/30"
        >
          <MessageSquare className="h-4 w-4" />
          Open Team Chat
        </Link>
      </div>
    </aside>
  )
}
