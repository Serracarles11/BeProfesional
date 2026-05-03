'use client'

import Link from 'next/link'
import { BarChart3, CalendarDays, LayoutDashboard, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { withEquipo } from '../utils'

type SquadMobileNavProps = {
  equipoId?: string
}

export function SquadMobileNav({ equipoId }: SquadMobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-between bg-white/90 px-8 py-3 backdrop-blur-lg md:hidden">
      <NavLink href={withEquipo('/home', equipoId)} label="Dash" icon={<LayoutDashboard className="h-4 w-4" />} />
      <NavLink href={withEquipo('/jugadores', equipoId)} label="Squad" active icon={<Users className="h-4 w-4" />} />
      <NavLink href={withEquipo('/partidos', equipoId)} label="Cal" icon={<CalendarDays className="h-4 w-4" />} />
      <NavLink href={withEquipo('/estadisticas', equipoId)} label="Estadísticas" icon={<BarChart3 className="h-4 w-4" />} />
    </nav>
  )
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: ReactNode
  active?: boolean
}) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 ${active ? 'text-[#005db6]' : 'text-[#727785]'}`}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </Link>
  )
}
