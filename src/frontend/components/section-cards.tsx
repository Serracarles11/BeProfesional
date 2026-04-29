import {
  IconCalendarStats,
  IconMapPin,
  IconShirtSport,
  IconUsers,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SectionCardsProps = {
  totalEquipos: number
  totalJugadores: number
  temporadaActual: string
  totalCampos: number
}

const cards = [
  {
    key: "equipos",
    label: "Equipos",
    helper: "Plantillas vinculadas al club",
    icon: IconShirtSport,
  },
  {
    key: "jugadores",
    label: "Jugadores",
    helper: "Jugadores activos en equipos",
    icon: IconUsers,
  },
  {
    key: "temporada",
    label: "Temporada",
    helper: "Temporada mas repetida",
    icon: IconCalendarStats,
  },
  {
    key: "campos",
    label: "Campos",
    helper: "Campos de juego registrados",
    icon: IconMapPin,
  },
] as const

export function SectionCards({
  totalEquipos,
  totalJugadores,
  temporadaActual,
  totalCampos,
}: SectionCardsProps) {
  const values = {
    equipos: `${totalEquipos}`,
    jugadores: `${totalJugadores}`,
    temporada: temporadaActual || "-",
    campos: `${totalCampos}`,
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card
            key={card.key}
            className="@container/card border-[var(--bp-soft)]/70 bg-gradient-to-t from-[var(--bp-soft)]/30 to-card shadow-sm"
          >
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-[var(--bp-ink)] @[250px]/card:text-3xl">
                {values[card.key]}
              </CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className="border-[var(--bp-mid)]/40 text-[var(--bp-primary)]"
                >
                  <Icon className="size-4" />
                  Club
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium text-[var(--bp-ink)]">
                {card.helper}
              </div>
              <div className="text-muted-foreground">Datos de la base de datos</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
