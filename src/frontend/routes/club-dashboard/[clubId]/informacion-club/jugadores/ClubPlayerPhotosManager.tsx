'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Clock,
  Goal,
  Search,
  ShieldAlert,
  Trophy,
  Users,
  X,
} from 'lucide-react'

export type ClubPhotoTeam = {
  id: string
  nombre: string
  categoria: string
  categoriaAnio: string
  temporada: string
}

export type ClubPhotoPlayer = {
  id: string
  profileId: string
  teamId: string
  name: string
  teamName: string
  teamCategory: string
  teamCategoryYear: string
  dorsal: number | null
  position: string | null
  age: number | null
  avatarUrl: string | null
  stats: {
    apps: number
    starts: number
    minutes: number
    goals: number
    assists: number
    yellows: number
    reds: number
  }
}

type Props = {
  clubId: string
  clubName: string
  teams: ClubPhotoTeam[]
  players: ClubPhotoPlayer[]
  canEdit: boolean
}

type SortKey = 'name' | 'dorsal' | 'apps' | 'minutes' | 'goals' | 'assists' | 'cards'
type SortDirection = 'desc' | 'asc'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function initials(name: string) {
  const parts = name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)

  if (parts.length === 0) return 'JG'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function avatarColor(id: string) {
  const colors = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d']
  const code = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[code % colors.length]
}

function PlayerAvatar({ player }: { player: ClubPhotoPlayer }) {
  return (
    <div className="club-player-avatar" style={{ background: avatarColor(player.profileId) }}>
      {initials(player.name)}
    </div>
  )
}

function StatsModal({ player, onClose }: { player: ClubPhotoPlayer; onClose: () => void }) {
  const goalsPer90 = player.stats.minutes > 0 ? ((player.stats.goals / player.stats.minutes) * 90).toFixed(2) : '0.00'
  const assistsPer90 = player.stats.minutes > 0 ? ((player.stats.assists / player.stats.minutes) * 90).toFixed(2) : '0.00'

  return (
    <div className="club-stats-overlay" onClick={(event) => event.currentTarget === event.target && onClose()}>
      <section className="club-stats-modal">
        <header>
          <div className="modal-player">
            <PlayerAvatar player={player} />
            <div>
              <h3>{player.name}</h3>
              <p>#{player.dorsal ?? '-'} · {player.position ?? 'Sin posicion'} · {player.teamName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>

        <div className="modal-stats-grid">
          {[
            ['Partidos', player.stats.apps],
            ['Titularidades', player.stats.starts],
            ['Minutos', player.stats.minutes],
            ['Goles', player.stats.goals],
            ['Asistencias', player.stats.assists],
            ['Goles / 90', goalsPer90],
            ['Asist. / 90', assistsPer90],
            ['Amarillas', player.stats.yellows],
            ['Rojas', player.stats.reds],
          ].map(([label, value]) => (
            <article key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function PlayerCard({ player, onStats }: { player: ClubPhotoPlayer; onStats: (player: ClubPhotoPlayer) => void }) {
  return (
    <article className="club-player-card">
      <header>
        <PlayerAvatar player={player} />
        <div>
          <h3>{player.name}</h3>
          <p>{player.teamName} · {player.teamCategory}</p>
        </div>
      </header>
      <div className="club-player-card-body">
        <span className="dorsal">#{player.dorsal ?? '-'}</span>
        <span>{player.position ?? 'Sin posicion'}</span>
        <span>{player.teamCategoryYear}</span>
      </div>
      <div className="card-mini-stats">
        <div><strong>{player.stats.apps}</strong><span>Partidos</span></div>
        <div><strong>{player.stats.minutes}</strong><span>Minutos</span></div>
        <div><strong>{player.stats.goals}</strong><span>Goles</span></div>
      </div>
      <footer>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onStats(player)}>
          <BarChart3 size={14} />
          Ver estadisticas
        </button>
      </footer>
    </article>
  )
}

export function ClubPlayerPhotosManager({ clubName, teams, players }: Props) {
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('goals')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedPlayer, setSelectedPlayer] = useState<ClubPhotoPlayer | null>(null)

  const filtered = useMemo(() => {
    const needle = normalize(search)
    const rows = players.filter((player) => {
      if (needle && !normalize(player.name).includes(needle)) return false
      if (teamFilter && player.teamId !== teamFilter) return false
      return true
    })

    const direction = sortDirection === 'asc' ? 1 : -1

    return [...rows].sort((a, b) => {
      const aCards = a.stats.yellows + a.stats.reds
      const bCards = b.stats.yellows + b.stats.reds
      const values: Record<SortKey, [number | string, number | string]> = {
        name: [a.name, b.name],
        dorsal: [a.dorsal ?? 999, b.dorsal ?? 999],
        apps: [a.stats.apps, b.stats.apps],
        minutes: [a.stats.minutes, b.stats.minutes],
        goals: [a.stats.goals, b.stats.goals],
        assists: [a.stats.assists, b.stats.assists],
        cards: [aCards, bCards],
      }
      const [left, right] = values[sortKey]

      if (typeof left === 'string' && typeof right === 'string') {
        return left.localeCompare(right, 'es') * direction
      }

      const numericDiff = (Number(left) - Number(right)) * direction
      if (numericDiff !== 0) return numericDiff
      return a.name.localeCompare(b.name, 'es')
    })
  }, [players, search, sortDirection, sortKey, teamFilter])

  const totalApps = players.reduce((acc, player) => acc + player.stats.apps, 0)
  const totalMinutes = players.reduce((acc, player) => acc + player.stats.minutes, 0)
  const totalGoals = players.reduce((acc, player) => acc + player.stats.goals, 0)
  const totalAssists = players.reduce((acc, player) => acc + player.stats.assists, 0)

  return (
    <div className="club-players-manager">
      <header className="page-header">
        <div>
          <h1>Jugadores</h1>
          <p>Consulta la plantilla y las estadisticas individuales de {clubName}</p>
        </div>
      </header>

      <section className="stats-bar">
        {[
          { icon: Users, label: 'Jugadores', value: players.length, color: '#2563eb', bg: '#eff6ff' },
          { icon: Trophy, label: 'Partidos', value: totalApps, color: '#7c3aed', bg: '#f5f3ff' },
          { icon: Clock, label: 'Minutos', value: totalMinutes, color: '#0891b2', bg: '#ecfeff' },
          { icon: Goal, label: 'Goles', value: totalGoals, color: '#22c55e', bg: '#f0fdf4' },
          { icon: Activity, label: 'Asistencias', value: totalAssists, color: '#f59e0b', bg: '#fffbeb' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="stat-card">
              <span style={{ color: stat.color, background: stat.bg }}><Icon size={18} /></span>
              <div><strong>{stat.value}</strong><p>{stat.label}</p></div>
            </article>
          )
        })}
      </section>

      <section className="filter-card">
        <label className="search-wrap">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador por nombre..." />
        </label>
        <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
          <option value="">Todos los equipos</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.nombre}</option>)}
        </select>
        <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
          <option value="goals">Ordenar por goles</option>
          <option value="assists">Ordenar por asistencias</option>
          <option value="minutes">Ordenar por minutos</option>
          <option value="cards">Ordenar por tarjetas</option>
          <option value="apps">Ordenar por partidos</option>
          <option value="dorsal">Ordenar por dorsal</option>
          <option value="name">Ordenar por nombre</option>
        </select>
        <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
          <option value="desc">Mayor a menor</option>
          <option value="asc">Menor a mayor</option>
        </select>
        <em><strong>{filtered.length}</strong> jugador{filtered.length === 1 ? '' : 'es'}</em>
      </section>

      <section className="players-grid">
        {filtered.length === 0 ? (
          <div className="state-box">
            <ShieldAlert size={34} />
            <strong>No hay resultados</strong>
            <p>Prueba a cambiar los filtros para ver mas jugadores.</p>
          </div>
        ) : (
          filtered.map((player) => (
            <PlayerCard key={player.id} player={player} onStats={setSelectedPlayer} />
          ))
        )}
      </section>

      {selectedPlayer ? <StatsModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} /> : null}

      <style jsx global>{`
        .club-players-manager{font-family:Inter,system-ui,sans-serif;color:#1e293b}
        .club-players-manager *{box-sizing:border-box}.club-players-manager button,.club-players-manager input,.club-players-manager select{font-family:inherit}
        .page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}.page-header h1{font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.5px}.page-header p{font-size:14px;color:#64748b;margin-top:4px}
        .stats-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px}.stat-card{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;box-shadow:0 1px 3px rgba(15,23,42,.08)}.stat-card>span{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center}.stat-card strong{font-size:22px;font-weight:900;color:#0f172a}.stat-card p{font-size:12px;color:#64748b;margin-top:3px}
        .filter-card{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(15,23,42,.08)}.search-wrap{position:relative;flex:1;min-width:220px}.search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8}.filter-card input,.filter-card select{height:39px;border:1.5px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#334155;font-size:13px;outline:none}.filter-card input{width:100%;padding:0 12px 0 36px}.filter-card select{padding:0 34px 0 12px}.filter-card input:focus,.filter-card select:focus{border-color:#3b82f6;background:#fff;box-shadow:0 0 0 3px rgba(59,130,246,.1)}.filter-card em{margin-left:auto;color:#64748b;font-size:13px;font-style:normal}.filter-card em strong{color:#0f172a}
        .players-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}.club-player-card{display:flex;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);transition:.2s}.club-player-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(15,23,42,.08);border-color:#cbd5e1}.club-player-card header{display:flex;flex-direction:column;align-items:center;gap:12px;background:#f8fafc;border-bottom:1px solid #f1f5f9;padding:20px 20px 14px}.club-player-avatar{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:900;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,.12)}.club-player-card h3{font-size:15px;font-weight:800;text-align:center;color:#0f172a}.club-player-card header p{font-size:12px;color:#64748b;text-align:center;margin-top:1px}.club-player-card-body{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;padding:14px 16px}.club-player-card-body span{display:inline-flex;padding:4px 9px;border-radius:20px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;font-size:11px;font-weight:700}.club-player-card-body .dorsal{background:#eff6ff;color:#1d4ed8;border-color:#dbeafe}.card-mini-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid #f1f5f9;padding:12px 10px;text-align:center}.card-mini-stats strong{display:block;color:#0f172a;font-size:16px}.card-mini-stats span{display:block;margin-top:2px;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase}.club-player-card footer{display:flex;gap:8px;border-top:1px solid #f1f5f9;padding:12px 16px}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:12px;padding:9px 14px;font-size:13px;font-weight:800;cursor:pointer;transition:.18s}.btn-primary{background:#2563eb;color:#fff;flex:1}.btn-primary:hover{background:#1d4ed8}.btn-sm{padding:7px 12px;font-size:12px}
        .state-box{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;color:#94a3b8;text-align:center}.state-box strong{margin-top:12px;color:#334155}.state-box p{margin-top:6px;font-size:13px;max-width:300px}
        .club-stats-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);padding:24px}.club-stats-modal{width:100%;max-width:640px;background:#fff;border-radius:24px;box-shadow:0 24px 60px rgba(15,23,42,.16);overflow:hidden}.club-stats-modal header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:24px 28px 20px;border-bottom:1px solid #f1f5f9}.club-stats-modal header button{width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#64748b;display:flex;align-items:center;justify-content:center}.modal-player{display:flex;align-items:center;gap:14px}.modal-player .club-player-avatar{width:56px;height:56px;font-size:18px}.modal-player h3{font-size:18px;font-weight:900;color:#0f172a}.modal-player p{font-size:13px;color:#64748b;margin-top:3px}.modal-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:24px 28px}.modal-stats-grid article{border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:16px;text-align:center}.modal-stats-grid strong{display:block;color:#0f172a;font-size:24px;font-weight:900}.modal-stats-grid span{display:block;margin-top:4px;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase}
        @media (max-width:1100px){.stats-bar{grid-template-columns:repeat(3,1fr)}}@media (max-width:700px){.stats-bar,.modal-stats-grid{grid-template-columns:1fr}.players-grid{grid-template-columns:1fr}.page-header{flex-direction:column}.filter-card em{margin-left:0}.club-stats-overlay{padding:12px}}
      `}</style>
    </div>
  )
}
