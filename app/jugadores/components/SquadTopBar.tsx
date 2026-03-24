'use client'

import Link from 'next/link'
import { Bell, Search, Settings } from 'lucide-react'
import { withEquipo } from '../utils'

type SquadTopBarProps = {
  equipoId?: string
  searchTerm: string
  onSearchTermChange: (value: string) => void
  avatarUrl?: string | null
}

export function SquadTopBar({ equipoId, searchTerm, onSearchTermChange, avatarUrl }: SquadTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex w-full items-center justify-between bg-[#f7f9fe]/85 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-8">
        <h1 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black tracking-tighter text-[#005db6]">
          AZURE ATHLETIC
        </h1>

        <div className="hidden items-center gap-6 lg:flex">
          <Link href={withEquipo('/jugadores', equipoId)} className="border-b-2 border-[#005db6] py-1 text-sm font-bold text-[#005db6]">
            Roster
          </Link>
          <Link href={withEquipo('/estadisticas', equipoId)} className="text-sm font-medium text-[#727785] transition-colors hover:text-[#005db6]">
            Tactics
          </Link>
          <Link href={withEquipo('/entrenamientos', equipoId)} className="text-sm font-medium text-[#727785] transition-colors hover:text-[#005db6]">
            Training
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        <label className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727785]" />
          <input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search players..."
            className="w-56 rounded-full border-none bg-[#f1f4f9] py-2 pl-9 pr-4 text-sm text-[#181c20] focus:ring-2 focus:ring-[#005db6]/20"
          />
        </label>

        <button type="button" className="rounded-full p-2 text-[#727785] transition-colors hover:bg-[#d9e2ff] hover:text-[#005db6]" aria-label="Notificaciones">
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button type="button" className="rounded-full p-2 text-[#727785] transition-colors hover:bg-[#d9e2ff] hover:text-[#005db6]" aria-label="Ajustes">
          <Settings className="h-[18px] w-[18px]" />
        </button>

        <div className="ml-1 h-10 w-10 overflow-hidden rounded-full border-2 border-[#3176d2]/20 bg-[#dfe3e8]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#a9c7ff] to-[#005db6]" />
          )}
        </div>
      </div>
    </header>
  )
}
