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
  return Math.max(player.stats.apps, 0)
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

export function ratingValue(player: SquadPlayer) {
  const apps = estimatedApps(player)
  const minutesFactor = player.stats.minutes / Math.max(apps * 90, 1)
  const scoringFactor = player.stats.goals * 0.45
  const volumeFactor = Math.min(player.stats.minutes / 450, 1.2)
  const raw = 5.5 + scoringFactor + minutesFactor * 1.4 + volumeFactor
  const clamped = Math.max(Math.min(raw, 9.8), 5.8)
  return clamped.toFixed(1)
}

export function goalsPer90(player: SquadPlayer) {
  if (!Number.isFinite(player.stats.minutes) || player.stats.minutes <= 0) return 0
  return (player.stats.goals / player.stats.minutes) * 90
}

export function formatGoalsPer90(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0.00'
  return value.toFixed(2)
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
