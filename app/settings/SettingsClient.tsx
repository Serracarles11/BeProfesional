'use client'
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, Loader2, Save, UserRound } from 'lucide-react'
import Sidebar from '@/app/home/components/Sidebar'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type SettingsProfile = {
  nombre: string
  genero: string
  edad: string
  peso_kg: string
  altura_cm: string
  posicion: string
  pie_dominante: string
  telefono: string
  ciudad: string
  pais: string
  bio: string
  instagram: string
  objetivo: string
  foto_url: string | null
}

const EMPTY_PROFILE: SettingsProfile = {
  nombre: '',
  genero: '',
  edad: '',
  peso_kg: '',
  altura_cm: '',
  posicion: '',
  pie_dominante: '',
  telefono: '',
  ciudad: '',
  pais: '',
  bio: '',
  instagram: '',
  objetivo: '',
  foto_url: null,
}

function toStringOrEmpty(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeProfile(raw: Record<string, unknown> | null | undefined): SettingsProfile {
  if (!raw) return { ...EMPTY_PROFILE }
  return {
    nombre: toStringOrEmpty(raw.nombre),
    genero: toStringOrEmpty(raw.genero),
    edad: toStringOrEmpty(raw.edad),
    peso_kg: toStringOrEmpty(raw.peso_kg),
    altura_cm: toStringOrEmpty(raw.altura_cm),
    posicion: toStringOrEmpty(raw.posicion),
    pie_dominante: toStringOrEmpty(raw.pie_dominante),
    telefono: toStringOrEmpty(raw.telefono),
    ciudad: toStringOrEmpty(raw.ciudad),
    pais: toStringOrEmpty(raw.pais),
    bio: toStringOrEmpty(raw.bio),
    instagram: toStringOrEmpty(raw.instagram),
    objetivo: toStringOrEmpty(raw.objetivo),
    foto_url: typeof raw.foto_url === 'string' ? raw.foto_url : null,
  }
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f86b8]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-xl border border-[#d7e2fb] bg-white px-3 py-2.5 text-sm text-[#0e1f46] outline-none transition focus:border-[#5086F2] focus:ring-2 focus:ring-[#5086F2]/20"
      />
    </label>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f86b8]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-[#d7e2fb] bg-white px-3 py-2.5 text-sm text-[#0e1f46] outline-none transition focus:border-[#5086F2] focus:ring-2 focus:ring-[#5086F2]/20"
      />
    </label>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  const [profile, setProfile] = useState<SettingsProfile>({ ...EMPTY_PROFILE })
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const response = await fetch('/api/profile/settings', { cache: 'no-store' })
      const data = (await response.json()) as {
        ok?: boolean
        error?: string
        profile?: Record<string, unknown>
        email?: string
      }

      if (!response.ok || !data.ok) {
        setStatus('error')
        setError(data.error || 'No se pudo cargar ajustes.')
        return
      }

      const normalized = normalizeProfile(data.profile)
      setProfile(normalized)
      setPreviewUrl(normalized.foto_url)
      setEmail(data.email || '')
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('No se pudo cargar ajustes.')
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const initial = useMemo(() => profile.nombre?.charAt(0)?.toUpperCase() || 'U', [profile.nombre])

  const setField = (field: keyof SettingsProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  const removeBackground = useCallback(async (file: File): Promise<Blob> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/remove-background', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      let message = 'No se pudo quitar el fondo de la imagen.'
      const contentType = response.headers.get('content-type') ?? ''

      if (contentType.includes('application/json')) {
        const data = (await response.json()) as { error?: string }
        if (data.error) message = data.error
      } else {
        const text = await response.text()
        if (text) message = text
      }

      throw new Error(message)
    }

    return response.blob()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          edad: profile.edad,
          peso_kg: profile.peso_kg,
          altura_cm: profile.altura_cm,
        }),
      })

      const data = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !data.ok) {
        setError(data.error || 'No se pudo guardar.')
        return
      }

      setSuccess('Cambios guardados correctamente.')
    } catch {
      setError('No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const inputElement = event.target
    if (!file) return

    setUploadingPhoto(true)
    setError('')
    setSuccess('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato no valido. Usa JPG, PNG o WEBP.')
      setUploadingPhoto(false)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La foto supera el maximo de 5 MB.')
      setUploadingPhoto(false)
      return
    }

    const previousPreview = previewUrl
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)

    try {
      const processedBlob = await removeBackground(file)
      const processedFile = new File([processedBlob], 'profile-no-bg.png', { type: 'image/png' })

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('No se pudo validar la sesion para subir la foto.')
        return
      }

      const filePath = `${user.id}/${Date.now()}-profile.png`
      const uploadResult = await supabase.storage
        .from('profile-photos')
        .upload(filePath, processedFile, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadResult.error) {
        setError(`No se pudo subir la foto a Storage: ${uploadResult.error.message}`)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath)
      const fotoUrl = publicUrlData.publicUrl

      const persistResponse = await fetch('/api/profile/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_url: fotoUrl }),
      })

      const persistData = (await persistResponse.json()) as { ok?: boolean; error?: string }
      if (!persistResponse.ok || !persistData.ok) {
        setError(persistData.error || 'No se pudo guardar la URL de foto en el perfil.')
        return
      }

      setPreviewUrl(fotoUrl)
      setProfile((current) => ({ ...current, foto_url: fotoUrl }))
      setSuccess('Foto procesada y actualizada correctamente.')
    } catch (uploadError) {
      const message =
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : 'No se pudo procesar o subir la foto.'
      setPreviewUrl(previousPreview)
      setError(message)
    } finally {
      setUploadingPhoto(false)
      inputElement.value = ''
      URL.revokeObjectURL(localPreview)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#e7ebf3] p-4">
        <div className="mx-auto max-w-[1250px] rounded-2xl bg-white p-8">Cargando ajustes...</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#e7ebf3] p-4">
        <div className="mx-auto max-w-[1250px] rounded-2xl bg-white p-8">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="mt-4 rounded-lg bg-[#0439D9] px-4 py-2 text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#edf1f8_0%,#dbe5f6_42%,#cfddf7_100%)] p-4 lg:p-5">
      <div className="mx-auto grid max-w-[1450px] gap-3 lg:grid-cols-[86px_minmax(0,1fr)]">
        <Sidebar equipoId={equipoId} />

        <main className="space-y-3 pb-20 lg:pb-0">
          <section className="rounded-2xl border border-[#d8e3f8] bg-white/90 px-5 py-5 shadow-[0_12px_30px_rgba(7,25,71,0.08)]">
            <h1 className="text-2xl font-semibold text-[#07163b]">Ajustes de usuario</h1>
            <p className="mt-1 text-sm text-[#45629c]">
              Edita tu perfil, actualiza foto y personaliza la informacion de tu cuenta.
            </p>
          </section>

          <section className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-[#d8e3f8] bg-white/90 p-5 shadow-[0_12px_30px_rgba(7,25,71,0.08)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f86b8]">Foto de perfil</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#d5e0f7] bg-[#eef3ff]">
                {previewUrl ? (
                  <img src={previewUrl} alt={profile.nombre || 'Perfil'} className="h-[280px] w-full object-cover" />
                ) : (
                  <div className="flex h-[280px] w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#7fa6f1_0%,#4f7ed0_50%,#1a356f_100%)] text-7xl font-semibold text-white">
                    {initial}
                  </div>
                )}
              </div>

              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#5086F2]/30 bg-[#ebf2ff] px-4 py-2.5 text-sm font-semibold text-[#1542a0] transition hover:bg-[#dbe8ff]">
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void handlePhotoFile(event)}
                  disabled={uploadingPhoto}
                />
              </label>

              <p className="mt-3 text-xs text-[#5470a6]">
                Formatos permitidos: JPG, PNG, WEBP. Tamano maximo: 5 MB.
              </p>
            </aside>

            <section className="rounded-2xl border border-[#d8e3f8] bg-white/90 p-5 shadow-[0_12px_30px_rgba(7,25,71,0.08)]">
              <div className="grid gap-3 md:grid-cols-2">
                <InputField label="Nombre" value={profile.nombre} onChange={(value) => setField('nombre', value)} />
                <InputField label="Email (solo lectura)" value={email} onChange={() => {}} readOnly />

                <InputField label="Genero" value={profile.genero} onChange={(value) => setField('genero', value)} />
                <InputField label="Posicion" value={profile.posicion} onChange={(value) => setField('posicion', value)} />

                <InputField
                  label="Pie dominante"
                  value={profile.pie_dominante}
                  onChange={(value) => setField('pie_dominante', value)}
                />
                <InputField label="Edad" type="number" value={profile.edad} onChange={(value) => setField('edad', value)} />

                <InputField label="Peso (kg)" type="number" value={profile.peso_kg} onChange={(value) => setField('peso_kg', value)} />
                <InputField label="Altura (cm)" type="number" value={profile.altura_cm} onChange={(value) => setField('altura_cm', value)} />

                <InputField label="Telefono" value={profile.telefono} onChange={(value) => setField('telefono', value)} />
                <InputField label="Ciudad" value={profile.ciudad} onChange={(value) => setField('ciudad', value)} />

                <InputField label="Pais" value={profile.pais} onChange={(value) => setField('pais', value)} />
                <InputField label="Instagram" value={profile.instagram} onChange={(value) => setField('instagram', value)} />
              </div>

              <div className="mt-3 grid gap-3">
                <TextareaField
                  label="Objetivo deportivo"
                  value={profile.objetivo}
                  onChange={(value) => setField('objetivo', value)}
                  placeholder="Objetivos de temporada, metas fisicas o tacticas..."
                  rows={3}
                />
                <TextareaField
                  label="Bio"
                  value={profile.bio}
                  onChange={(value) => setField('bio', value)}
                  placeholder="Descripcion corta sobre ti."
                  rows={4}
                />
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              ) : null}
              {success ? (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0439D9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#032fb0] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push(equipoId ? `/home?equipo=${encodeURIComponent(equipoId)}` : '/home')}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#c6d5f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#244a9e] transition hover:bg-[#edf3ff]"
                >
                  <UserRound className="h-4 w-4" />
                  Volver al Home
                </button>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}
