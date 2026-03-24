import type { PositionFilter, SquadPlayer, SquadSuccessResponse } from './types'

export function withEquipo(path: string, equipoId?: string | null) {
  if (!equipoId) return path
  return `${path}?equipo=${encodeURIComponent(equipoId)}`
}

export function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function playerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function positionGroup(position: string | null | undefined): Exclude<PositionFilter, 'ALL'> {
  const normalized = normalizeText(position)

  if (normalized.includes('por') || normalized.includes('gk') || normalized.includes('goal')) return 'GK'
  if (normalized.includes('def') || normalized.includes('lateral') || normalized.includes('central') || normalized.includes('cb')) return 'DEF'
  if (normalized.includes('med') || normalized.includes('mid') || normalized.includes('mc')) return 'MID'
  if (normalized.includes('del') || normalized.includes('fw') || normalized.includes('dc') || normalized.includes('wing')) return 'FWD'

  return 'MID'
}

export function estimatedApps(player: SquadPlayer) {
  if (player.stats.starts > 0) return player.stats.starts
  if (player.stats.minutes <= 0) return 0
  return Math.max(Math.round(player.stats.minutes / 90), 1)
}

export function filterPlayers(players: SquadPlayer[], filter: PositionFilter, searchTerm: string) {
  const needle = normalizeText(searchTerm)

  return players.filter((player) => {
    const byFilter = filter === 'ALL' || positionGroup(player.position) === filter

    if (!needle) return byFilter

    const searchable = [
      player.name,
      player.team,
      player.position ?? '',
      player.dorsal === null ? '' : String(player.dorsal),
    ]
      .map((value) => normalizeText(value))
      .join(' ')

    return byFilter && searchable.includes(needle)
  })
}

export function cardSecondaryMetric(player: SquadPlayer) {
  const group = positionGroup(player.position)

  if (group === 'GK') {
    const saves = Math.max(Math.round(estimatedApps(player) * 2.1 + player.stats.starts * 0.2), 0)
    return { label: 'Saves', value: String(saves) }
  }

  if (group === 'DEF') {
    const duels = Math.min(Math.max(Math.round(68 + estimatedApps(player) * 0.6), 62), 95)
    return { label: 'Duel', value: `${duels}%` }
  }

  return { label: 'Goals', value: String(player.stats.goals) }
}

export function ratingValue(player: SquadPlayer) {
  const apps = estimatedApps(player)
  if (apps <= 0) return '--'

  const form = player.stats.minutes / Math.max(apps * 90, 1)
  const raw = 6 + player.stats.goals * 0.35 + player.stats.starts * 0.08 + form * 0.9
  const clamped = Math.max(Math.min(raw, 9.8), 5.8)
  return clamped.toFixed(1)
}

export function formatNextMatch(summary: SquadSuccessResponse['summary']) {
  if (!summary.nextMatchDate) return 'Sin partido programado'

  const date = new Date(summary.nextMatchDate)
  if (Number.isNaN(date.getTime())) return 'Sin partido programado'

  const dateLabel = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })

  const rival = summary.nextMatchRival ?? 'Rival por confirmar'
  return `${dateLabel} vs ${rival}`
}

export function positionTagLabel(position: string | null | undefined) {
  const group = positionGroup(position)
  if (group === 'GK') return 'GOALKEEPER'
  if (group === 'DEF') return 'DEFENDER'
  if (group === 'MID') return 'MIDFIELDER'
  if (group === 'FWD') return 'FORWARD'
  return 'PLAYER'
}
