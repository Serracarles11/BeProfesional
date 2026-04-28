'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export type CategoriaEquipo =
  | 'PREBENJAMIN'
  | 'BENJAMIN'
  | 'ALEVIN'
  | 'INFANTIL'
  | 'CADETE'
  | 'JUVENIL'
  | 'AMATEUR'

export type CategoriaAnio = '1R' | '2N' | '3R'

export type ClubOption = {
  id: string
  nombre: string
}

export const CATEGORIAS_EQUIPO: Array<{ value: CategoriaEquipo; label: string }> = [
  { value: 'PREBENJAMIN', label: 'Prebenjamín' },
  { value: 'BENJAMIN', label: 'Benjamín' },
  { value: 'ALEVIN', label: 'Alevín' },
  { value: 'INFANTIL', label: 'Infantil' },
  { value: 'CADETE', label: 'Cadete' },
  { value: 'JUVENIL', label: 'Juvenil' },
  { value: 'AMATEUR', label: 'Amateur' },
]

export function getAniosPorCategoria(categoria: string | null | undefined) {
  if (categoria === 'JUVENIL') {
    return [
      { value: '1R', label: '1r año' },
      { value: '2N', label: '2º año' },
      { value: '3R', label: '3r año' },
    ]
  }

  if (categoria === 'AMATEUR') return []
  if (!categoria) return []

  return [
    { value: '1R', label: '1r año' },
    { value: '2N', label: '2º año' },
  ]
}

export function normalizarNombreClub(nombre: string) {
  return nombre.trim().replace(/\s+/g, ' ')
}

function getClient(supabase?: SupabaseClient) {
  return supabase ?? createSupabaseBrowser()
}

export async function buscarClubes(query: string, supabase?: SupabaseClient): Promise<ClubOption[]> {
  const cleanQuery = normalizarNombreClub(query)
  if (!cleanQuery) return []

  const { data, error } = await getClient(supabase)
    .from('clubes')
    .select('id, nombre')
    .ilike('nombre', `%${cleanQuery}%`)
    .order('nombre', { ascending: true })
    .limit(10)

  if (error) {
    throw new Error(error.message || 'No se pudo buscar el club.')
  }

  return (data ?? []).filter((club): club is ClubOption => {
    return typeof club.id === 'string' && typeof club.nombre === 'string'
  })
}

export async function crearClub(
  nombreClub: string,
  userId: string,
  supabase?: SupabaseClient
): Promise<ClubOption> {
  const nombre = normalizarNombreClub(nombreClub)
  if (!nombre) throw new Error('El club es obligatorio.')

  const client = getClient(supabase)
  const { data, error } = await client
    .from('clubes')
    .insert({ nombre, creado_por: userId })
    .select('id, nombre')
    .single()

  if (error) {
    const duplicate = error.code === '23505' || error.message?.toLocaleLowerCase().includes('duplicate')

    if (duplicate) {
      const existentes = await buscarClubes(nombre, client)
      const exacto = existentes.find((club) => {
        return normalizarNombreClub(club.nombre).toLocaleLowerCase() === nombre.toLocaleLowerCase()
      })

      if (exacto) return exacto
    }

    throw new Error(error.message || 'No se pudo crear el club.')
  }

  if (!data?.id || !data?.nombre) {
    throw new Error('La respuesta al crear el club es invalida.')
  }

  return data
}

export async function obtenerOcrearClub(
  nombreClub: string,
  userId: string,
  supabase?: SupabaseClient
): Promise<ClubOption> {
  const nombre = normalizarNombreClub(nombreClub)
  if (!nombre) throw new Error('El club es obligatorio.')

  const existentes = await buscarClubes(nombre, supabase)
  const exacto = existentes.find((club) => {
    return normalizarNombreClub(club.nombre).toLocaleLowerCase() === nombre.toLocaleLowerCase()
  })

  if (exacto) return exacto

  return crearClub(nombre, userId, supabase)
}

export const crearClubSiNoExiste = obtenerOcrearClub

export function esCategoriaEquipo(value: string): value is CategoriaEquipo {
  return CATEGORIAS_EQUIPO.some((categoria) => categoria.value === value)
}

export function esAnioCategoriaValido(categoria: string, anio: string | null | undefined) {
  if (categoria === 'AMATEUR') return !anio
  return getAniosPorCategoria(categoria).some((option) => option.value === anio)
}
