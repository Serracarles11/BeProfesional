'use client'
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ImagePlus, LoaderCircle, Upload, UserRound } from 'lucide-react'

type ProfilePhotoPromptProps = {
  next: string
  currentPhotoUrl: string | null
  displayName: string
}

function fileToPreview(file: File) {
  return URL.createObjectURL(file)
}

export default function ProfilePhotoPrompt({
  next,
  currentPhotoUrl,
  displayName,
}: ProfilePhotoPromptProps) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const initial = useMemo(() => displayName.charAt(0).toUpperCase() || 'J', [displayName])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setError('')

    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(currentPhotoUrl)
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Usa una imagen JPG, PNG o WEBP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera el maximo de 5 MB.')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(fileToPreview(file))
  }

  const handleSkip = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip', next }),
      })

      const data = (await response.json()) as { ok?: boolean; error?: string; redirectTo?: string }

      if (!response.ok || !data.ok || !data.redirectTo) {
        setError(data.error || 'No se pudo continuar sin foto.')
        return
      }

      router.push(data.redirectTo)
      router.refresh()
    } catch {
      setError('No se pudo continuar sin foto.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecciona una imagen antes de subirla.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('next', next)

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as { ok?: boolean; error?: string; redirectTo?: string }

      if (!response.ok || !data.ok || !data.redirectTo) {
        setError(data.error || 'No se pudo guardar la foto.')
        return
      }

      router.push(data.redirectTo)
      router.refresh()
    } catch {
      setError('No se pudo guardar la foto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bp-home-bg min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_380px]">
          <section className="bp-hero-panel rounded-[34px] px-6 py-6 md:px-8 md:py-8">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#DCE7FF]">
              Foto de perfil
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              Quieres subir una foto para tu perfil?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8E4FF] md:text-base">
              Es opcional, pero si la subes quedara guardada en tu perfil actual y se mostrara en la Home y en las
              vistas donde ya se reutiliza <code>perfiles.foto_url</code>.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[26px] border border-white/14 bg-white/10 p-5">
                <ImagePlus className="h-6 w-6 text-[#B3C5F5]" />
                <p className="mt-4 text-lg font-semibold text-white">Opcional</p>
                <p className="mt-2 text-sm leading-6 text-[#D8E4FF]">
                  Puedes continuar sin foto y el sistema usara avatar por defecto.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/14 bg-white/10 p-5">
                <Upload className="h-6 w-6 text-[#B3C5F5]" />
                <p className="mt-4 text-lg font-semibold text-white">Validada</p>
                <p className="mt-2 text-sm leading-6 text-[#D8E4FF]">
                  Solo JPG, PNG o WEBP de hasta 5 MB, usando el almacenamiento del mismo proyecto.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/14 bg-white/10 p-5">
                <Check className="h-6 w-6 text-[#B3C5F5]" />
                <p className="mt-4 text-lg font-semibold text-white">Integrada</p>
                <p className="mt-2 text-sm leading-6 text-[#D8E4FF]">
                  La URL se guarda en la base de datos actual y aparece despues en tu Home.
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-[22px] border border-red-300/35 bg-red-500/14 px-4 py-3 text-sm text-white">
                {error}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0439D9] transition hover:bg-[#DDE8FF]">
                <Upload className="h-4 w-4" />
                Elegir imagen
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>

              <button
                type="button"
                onClick={handleUpload}
                disabled={loading || !selectedFile}
                className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Guardar y continuar
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-transparent px-5 py-3 text-sm font-semibold text-[#D8E4FF] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continuar sin foto
              </button>
            </div>
          </section>

          <aside className="bp-player-panel rounded-[34px] px-6 py-6">
            <p className="text-right text-[11px] font-semibold uppercase tracking-[0.28em] text-[#B3C5F5]">
              Vista previa
            </p>

            <div className="mt-6 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_20%,rgba(179,197,245,0.82),rgba(80,134,242,0.42)_48%,rgba(1,17,64,0.96))]">
              {previewUrl ? (
                <img src={previewUrl} alt={displayName} className="h-[360px] w-full object-cover" />
              ) : (
                <div className="flex h-[360px] w-full items-center justify-center text-white">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/10 text-4xl font-semibold">
                    {initial}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-3xl font-semibold tracking-[-0.05em] text-white">{displayName}</p>
              <p className="mt-2 text-sm text-[#D8E4FF]">
                {selectedFile ? selectedFile.name : currentPhotoUrl ? 'Foto actual cargada' : 'Avatar por defecto'}
              </p>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/12 bg-white/10 p-4 text-sm leading-6 text-[#D8E4FF]">
              Esta pantalla también te sirve más adelante para reemplazar la imagen sin tocar la lógica del perfil ni la
              relacion actual con el usuario autenticado.
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
              <UserRound className="h-4 w-4 text-[#B3C5F5]" />
              {previewUrl ? 'La Home usara esta foto.' : 'La Home mostrara un avatar por defecto.'}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
