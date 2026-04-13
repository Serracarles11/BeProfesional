'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Dumbbell, Home, MessageSquare, Settings, Sparkles, Trophy, Users } from 'lucide-react'

function withTeam(path, teamId) {
  if (!teamId) return path
  return `${path}?equipo=${encodeURIComponent(teamId)}`
}

function isActive(pathname, basePath) {
  if (!basePath) return false
  if (pathname === basePath) return true
  return pathname.startsWith(`${basePath}/`)
}

export default function Sidebar({ equipoId }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTeamId = equipoId ?? searchParams.get('equipo')

  const items = [
    { id: 'home', label: 'Home', icon: Home, path: '/home', href: withTeam('/home', activeTeamId) },
    { id: 'team', label: 'Jugadores', icon: Users, path: '/estadisticas', href: withTeam('/estadisticas', activeTeamId) },
    { id: 'train', label: 'Entrenamiento', icon: Dumbbell, path: '/entrenamientos', href: withTeam('/entrenamientos', activeTeamId) },
    { id: 'trophies', label: 'Trofeos', icon: Trophy, path: '/partidos', href: withTeam('/partidos', activeTeamId) },
    { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/chat', href: withTeam('/chat', activeTeamId) },
    { id: 'play-maker', label: 'Play Maker', icon: Sparkles, path: '/play-maker', href: withTeam('/play-maker', activeTeamId) },
    { id: 'settings', label: 'Ajustes', icon: Settings, path: '/settings', href: withTeam('/settings', activeTeamId) },
  ]

  return (
    <>
      <aside className="hidden lg:flex h-full w-[86px] shrink-0 items-center justify-center rounded-[26px] bg-[#eceef1]">
        <nav className="flex h-[94%] w-[76%] flex-col items-center justify-start gap-3 rounded-[22px] bg-[#f1f2f4] py-4">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.path)
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                disabled={item.disabled}
                onClick={item.disabled ? undefined : () => router.push(item.href)}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                  active
                    ? 'bg-[#0d1b39] text-white shadow-[0_8px_18px_rgba(6,12,28,0.35)]'
                    : 'bg-transparent text-[#6f7a8c] hover:bg-[#e9ebef]'
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </button>
            )
          })}
        </nav>
      </aside>

      <nav className="fixed bottom-3 left-3 right-3 z-40 lg:hidden">
        <div className="grid grid-cols-7 gap-1 rounded-2xl border border-[#4a79df] bg-[#07205f]/90 p-2 backdrop-blur-xl">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.path)
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                disabled={item.disabled}
                onClick={item.disabled ? undefined : () => router.push(item.href)}
                className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] uppercase tracking-[0.12em] ${
                  active ? 'bg-[#5086F2] text-white' : 'text-[#bcd0ff]'
                } ${item.disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
