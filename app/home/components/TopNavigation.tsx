'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Settings } from 'lucide-react'
import { isActivePath, withEquipo } from '../utils'

type TopNavigationProps = {
  equipoId?: string
  avatarUrl?: string | null
}

const LINKS = [
  { label: 'Dashboard', href: '/home' },
  { label: 'Plantilla', href: '/jugadores' },
  { label: 'Calendario', href: '/partidos' },
  { label: 'Analisis', href: '/estadisticas' },
]

export function TopNavigation({ equipoId, avatarUrl }: TopNavigationProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-[#dfe3e8] bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <span className="[font-family:var(--font-plus-jakarta)] text-xl font-extrabold tracking-tight text-[#001945]">
            Azure Athletic
          </span>

          <nav className="hidden items-center gap-6 md:flex">
            {LINKS.map((link) => {
              const href = withEquipo(link.href, equipoId)
              const active = isActivePath(pathname, link.href)

              return (
                <Link
                  key={link.href}
                  href={href}
                  className={[
                    '[font-family:var(--font-plus-jakarta)] pb-1 text-sm font-bold tracking-tight transition-colors',
                    active
                      ? 'border-b-2 border-[#005db6] text-[#005db6]'
                      : 'text-[#5f6776] hover:text-[#005db6]',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full p-2 text-[#5f6776] transition hover:bg-[#eef2f8] hover:text-[#005db6]"
            aria-label="Notificaciones"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-[#5f6776] transition hover:bg-[#eef2f8] hover:text-[#005db6]"
            aria-label="Ajustes"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>

          <div className="h-8 w-8 overflow-hidden rounded-full bg-[#dfe3e8]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Perfil" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#a9c7ff] to-[#005db6]" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
