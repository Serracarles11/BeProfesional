"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconUsers,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export type ClubTeamTableRow = {
  id: string
  nombre: string
  categoria: string
  categoriaAnio: string
  temporada: string
  ubicacion: string
  campoJuego: string
  ciudad: string
  provincia: string
  pais: string
  jugadoresCount: number
}

function categoriaLabel(value: string) {
  const labels: Record<string, string> = {
    PREBENJAMIN: "Prebenjamin",
    BENJAMIN: "Benjamin",
    ALEVIN: "Alevin",
    INFANTIL: "Infantil",
    CADETE: "Cadete",
    JUVENIL: "Juvenil",
    AMATEUR: "Amateur",
  }

  return labels[value] ?? value
}

function EquipoDetails({ item }: { item: ClubTeamTableRow }) {
  const details = [
    ["Categoria", categoriaLabel(item.categoria)],
    ["Anio", item.categoriaAnio],
    ["Temporada", item.temporada],
    ["Jugadores", `${item.jugadoresCount}`],
    ["Campo", item.campoJuego],
    ["Ubicacion", item.ubicacion],
    ["Ciudad", item.ciudad],
    ["Provincia", item.provincia],
    ["Pais", item.pais],
  ]

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="h-auto w-fit px-0 text-left font-semibold text-[var(--bp-primary)]"
        >
          {item.nombre}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.nombre}</DrawerTitle>
          <DrawerDescription>
            Informacion registrada en la base de datos del club.
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 overflow-y-auto px-4 text-sm sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-card p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 font-semibold text-[var(--bp-ink)]">{value || "-"}</p>
            </div>
          ))}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button>Cerrar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const columns: ColumnDef<ClubTeamTableRow>[] = [
  {
    accessorKey: "nombre",
    header: "Equipo",
    cell: ({ row }) => <EquipoDetails item={row.original} />,
  },
  {
    accessorKey: "categoria",
    header: "Categoria",
    cell: ({ row }) => (
      <Badge className="bg-[var(--bp-soft)] text-[var(--bp-ink)] hover:bg-[var(--bp-soft)]">
        {categoriaLabel(row.original.categoria)}
      </Badge>
    ),
  },
  {
    accessorKey: "temporada",
    header: "Temporada",
  },
  {
    accessorKey: "jugadoresCount",
    header: () => <div className="text-right">Jugadores</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2 font-semibold">
        <IconUsers className="size-4 text-[var(--bp-mid)]" />
        {row.original.jugadoresCount}
      </div>
    ),
  },
  {
    accessorKey: "campoJuego",
    header: "Campo",
  },
  {
    accessorKey: "ciudad",
    header: "Ciudad",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex size-8" size="icon">
            <IconDotsVertical />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <a href={`/home?equipo=${encodeURIComponent(row.original.id)}`}>
              Ir al equipo
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export function DataTable({ data }: { data: ClubTeamTableRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Tabs defaultValue="equipos" className="w-full flex-col justify-start gap-6">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)]">Equipos del club</h2>
          <p className="text-sm text-muted-foreground">
            Datos cargados desde la base de datos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="rows-per-page" className="sr-only">
            Filas por pagina
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="w-36" id="rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 30].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize} filas
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TabsList className="mx-4 w-fit lg:mx-6">
        <TabsTrigger value="equipos">Equipos</TabsTrigger>
      </TabsList>

      <TabsContent
        value="equipos"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-[var(--bp-soft)]/35">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-[var(--bp-ink)]">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No hay equipos registrados para este club.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} equipo(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden size-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Primera pagina</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Pagina anterior</span>
              <IconChevronLeft />
            </Button>
            <div className="min-w-20 text-center text-sm font-medium">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </div>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Pagina siguiente</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ultima pagina</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
