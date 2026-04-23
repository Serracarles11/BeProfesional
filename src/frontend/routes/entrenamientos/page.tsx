import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowDownRight, ArrowUpRight, Ellipsis, MoveUpRight } from 'lucide-react'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  loadTrainingPerformanceData,
  type TrainingPerformanceData,
} from '@/lib/training-performance'

export const dynamic = 'force-dynamic'

type SearchParamsInput = Record<string, string | string[] | undefined>

const PANEL_STYLE = {
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 18px 50px rgba(0,0,0,0.08)',
}

const DARK_PANEL_STYLE = {
  ...PANEL_STYLE,
  background: 'linear-gradient(180deg, #1f2023 0%, #4a4c50 100%)',
  boxShadow: '0 18px 50px rgba(0,0,0,0.12)',
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function buildEquipoHref(path: string, equipoId: string | null) {
  if (!equipoId) return path
  return `${path}?equipo=${encodeURIComponent(equipoId)}`
}

function Shell({
  equipoId,
  teamName = 'Equipo',
  isCoach = false,
  children,
}: {
  equipoId?: string | null
  teamName?: string
  isCoach?: boolean
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen w-full bg-[#ededed]">
      <LeftNavigation equipoId={equipoId ?? undefined} teamName={teamName} isCoach={isCoach} />
      <div className="min-w-0 flex-1 space-y-4 px-4 py-5 md:px-6 md:py-6">{children}</div>
    </main>
  )
}

function NoticeCard({
  title,
  message,
  actions,
}: {
  title: string
  message: string
  actions: React.ReactNode
}) {
  return (
    <section className="rounded-[30px] bg-[#fafafa] p-6 md:p-7" style={PANEL_STYLE}>
      <h1 className="text-2xl font-semibold text-[#171717]">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-[#6a6a6a]">{message}</p>
      <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
    </section>
  )
}

function ChartMenu() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1f1] text-[#909090]">
      <Ellipsis className="h-4 w-4" />
    </div>
  )
}

function KpiCard({
  item,
}: {
  item: TrainingPerformanceData['kpis'][number]
}) {
  const TrendIcon = item.changeDirection === 'down' ? ArrowDownRight : ArrowUpRight

  return (
    <article
      className="rounded-[24px] px-4 py-3 text-white md:px-5 md:py-4"
      style={DARK_PANEL_STYLE}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.01em] text-white/72">{item.title}</p>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-white/82">
          <MoveUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[2rem] leading-none font-medium tracking-[-0.04em] text-white md:text-[2.2rem]">
          {item.value}
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-white/74">
          <TrendIcon className="h-3.5 w-3.5" />
          {item.changeLabel}
        </span>
      </div>
    </article>
  )
}

function getLineChartGeometry(points: TrainingPerformanceData['charts']['ejercicios']['points']) {
  const width = 560
  const height = 210
  const paddingX = 22
  const chartTop = 24
  const chartBottom = 48
  const chartHeight = height - chartTop - chartBottom
  const max = Math.max(...points.map((point) => point.value), 1)
  const min = Math.min(...points.map((point) => point.value), 0)
  const range = Math.max(max - min, 1)

  return points.map((point, index) => {
    const x =
      paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1)
    const normalized = (point.value - min) / range
    const y = chartTop + chartHeight - normalized * chartHeight
    return {
      ...point,
      x,
      y,
    }
  })
}

function buildLinePath(points: ReturnType<typeof getLineChartGeometry>) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
}

function LineChartCard({
  chart,
}: {
  chart: TrainingPerformanceData['charts']['ejercicios'] | TrainingPerformanceData['charts']['golesAsistencias']
}) {
  const points = getLineChartGeometry(chart.points)
  const path = buildLinePath(points)

  return (
    <section className="rounded-[28px] bg-[#fbfbfb] p-5 md:p-6" style={PANEL_STYLE}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span style={{ color: chart.accentColor }}>{chart.tabs[0]}</span>
            <span className="text-[#b1b1b1]">{chart.tabs[1]}</span>
          </div>
          {'caption' in chart && chart.caption ? (
            <p className="mt-2 text-[11px] text-[#aaaaaa]">{chart.caption}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <svg viewBox="0 0 560 210" className="h-[150px] w-full">
          {points.map((point) => (
            <line
              key={`guide-${point.label}`}
              x1={point.x}
              y1={point.y}
              x2={point.x}
              y2={164}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="1"
            />
          ))}

          <path
            d={path}
            fill="none"
            stroke={chart.accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) =>
            point.highlighted ? (
              <circle
                key={`point-${point.label}`}
                cx={point.x}
                cy={point.y}
                r="4.4"
                fill="#ffffff"
                stroke="#121212"
                strokeWidth="1.7"
              />
            ) : (
              <circle
                key={`point-${point.label}`}
                cx={point.x}
                cy={point.y}
                r="2.5"
                fill={chart.accentColor}
              />
            )
          )}

          {points.map((point) => (
            <text
              key={`label-${point.label}`}
              x={point.x}
              y={190}
              textAnchor="middle"
              fontSize="11"
              fill="#646464"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  )
}

function getBarChartGeometry(bars: TrainingPerformanceData['charts']['minutosJugados']['bars']) {
  const width = 560
  const height = 230
  const paddingX = 22
  const chartTop = 18
  const chartBottom = 54
  const chartHeight = height - chartTop - chartBottom
  const barWidth = 70
  const gap = (width - paddingX * 2 - barWidth * bars.length) / Math.max(bars.length - 1, 1)
  const max = Math.max(...bars.map((bar) => bar.value), 1)

  return bars.map((bar, index) => {
    const barHeight = (bar.value / max) * chartHeight
    const x = paddingX + index * (barWidth + gap)
    const y = chartTop + chartHeight - barHeight

    return {
      ...bar,
      x,
      y,
      width: barWidth,
      height: barHeight,
    }
  })
}

function BarChartCard({
  title,
  titleColor,
  bars,
  gradientId,
}: {
  title: string
  titleColor: string
  bars: TrainingPerformanceData['charts']['minutosJugados']['bars']
  gradientId: string
}) {
  const geometry = getBarChartGeometry(bars)

  return (
    <section className="rounded-[28px] bg-[#fbfbfb] p-5 md:p-6" style={PANEL_STYLE}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: titleColor }}>
          {title}
        </h2>
        <ChartMenu />
      </div>

      <div className="mt-4">
        <svg viewBox="0 0 560 230" className="h-[165px] w-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#101010" />
              <stop offset="100%" stopColor="#6f6f6f" />
            </linearGradient>
          </defs>

          {geometry.map((bar) => {
            const tooltipWidth = Math.max(54, (bar.tooltip?.length ?? 0) * 8 + 18)
            const tooltipX = bar.x + bar.width / 2 - tooltipWidth / 2
            const tooltipY = Math.max(4, bar.y - 38)

            return (
              <g key={bar.label}>
                {bar.tooltip ? (
                  <>
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height="30"
                      rx="15"
                      fill="#343434"
                    />
                    <text
                      x={bar.x + bar.width / 2}
                      y={tooltipY + 19}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="600"
                      fill="#ffffff"
                    >
                      {bar.tooltip}
                    </text>
                  </>
                ) : null}

                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={Math.max(bar.height, 12)}
                  rx="18"
                  fill={bar.highlighted ? `url(#${gradientId})` : '#efefef'}
                />

                <text
                  x={bar.x + bar.width / 2}
                  y={208}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#646464"
                >
                  {bar.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

function TeamStatsTable({
  rows,
}: {
  rows: TrainingPerformanceData['players']
}) {
  return (
    <section className="rounded-[28px] bg-[#fbfbfb] p-5 md:p-6" style={PANEL_STYLE}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-[#68d7bf]">Estadisticas del equipo</h2>
        <ChartMenu />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-[11px] font-medium text-[#a8a8a8]">
              <th className="px-3 py-2 font-medium">Jugadores</th>
              <th className="px-3 py-2 font-medium">Goles</th>
              <th className="px-3 py-2 font-medium">Asistencias</th>
              <th className="px-3 py-2 font-medium">Minutos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-[#f1f2ff]' : 'bg-[#f7f7fb]'}
              >
                <td className="rounded-l-[14px] px-3 py-3 text-[#2d2d2d]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#1d1d1d] text-[11px] font-semibold text-white">
                      {row.avatarUrl ? (
                        <img
                          src={row.avatarUrl}
                          alt={row.nombre}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        row.nombre.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium">{row.nombre}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-[#3c3c3c]">{row.goles}</td>
                <td className="px-3 py-3 text-[#3c3c3c]">{row.asistencias}</td>
                <td className="rounded-r-[14px] px-3 py-3 text-[#3c3c3c]">{row.minutos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PerformanceContent({
  data,
}: {
  data: TrainingPerformanceData
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((item) => (
          <KpiCard key={item.id} item={item} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard chart={data.charts.ejercicios} />
        <LineChartCard chart={data.charts.golesAsistencias} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BarChartCard
          title={data.charts.minutosJugados.title}
          titleColor={data.charts.minutosJugados.accentColor}
          bars={data.charts.minutosJugados.bars}
          gradientId="training-minutes-gradient"
        />
        <BarChartCard
          title={data.charts.fatiga.title}
          titleColor={data.charts.fatiga.accentColor}
          bars={data.charts.fatiga.bars}
          gradientId="training-fatigue-gradient"
        />
      </section>

      <TeamStatsTable rows={data.players} />
    </>
  )
}

export default async function EntrenamientosPage({
  searchParams,
}: {
  searchParams: SearchParamsInput | Promise<SearchParamsInput>
}) {
  const resolvedSearchParams = await searchParams
  const equipoId = getQueryValue(resolvedSearchParams.equipo)

  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const result = await loadTrainingPerformanceData({
    supabase,
    equipoId,
    userId: session.user.id,
  })

  if (!result.ok) {
    return (
      <Shell equipoId={equipoId}>
        <NoticeCard
          title="No se pudo cargar Entrenamiento / Performance"
          message={result.error}
          actions={
            <>
              <Link
                href={buildEquipoHref('/home', equipoId)}
                className="rounded-2xl bg-[#111111] px-4 py-2 text-sm font-semibold text-white"
              >
                Volver al dashboard
              </Link>
              <Link
                href="/equipos"
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#404040]"
              >
                Cambiar equipo
              </Link>
            </>
          }
        />
      </Shell>
    )
  }

  return (
    <Shell
      equipoId={equipoId}
      teamName={result.data.team?.nombre ?? 'Equipo'}
      isCoach={result.data.role === 'ENTRENADOR'}
    >
      <PerformanceContent data={result.data} />
    </Shell>
  )
}
