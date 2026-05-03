'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, Sparkles, Users } from 'lucide-react'

export default function UnirsePage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState(['', '', '', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleInputChange = (index: number, value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (sanitized.length > 1) return

    const next = [...codigo]
    next[index] = sanitized
    setCodigo(next)

    if (sanitized && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8)

    const next = [...codigo]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setCodigo(next)

    const lastFilled = Math.min(pasted.length - 1, 7)
    inputRefs.current[lastFilled]?.focus()
  }

  const getFullCode = () => codigo.slice(0, 4).join('') + '-' + codigo.slice(4).join('')
  const isCodeComplete = codigo.every((c) => c !== '')

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!isCodeComplete) return

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: getFullCode() }),
      })
      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Código inválido')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(data.redirectTo || '/equipos')
        router.refresh()
      }, 900)
    } catch {
      setError('Error de conexión')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Brand hero ── */}
      <div className="auth-hero hidden flex-col justify-between lg:flex lg:w-[52%] xl:w-[56%]">
        {/* Top logo */}
        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A73E8]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black italic tracking-tighter text-white">BeProfesional</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 px-10 xl:px-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1A73E8]/30 bg-[#1A73E8]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#60a5fa]">
            <Users className="h-3 w-3" />
            Acceso por invitación
          </div>
          <h1 className="text-[2.6rem] font-black leading-[1.06] tracking-tight text-white xl:text-5xl">
            Únete a tu<br />
            <span className="text-[#60a5fa]">equipo.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-slate-400">
            Tu entrenador ha generado un código de invitación. Introdúcelo para acceder al panel completo de tu equipo.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { step: '01', text: 'Recibe el código de 8 caracteres de tu entrenador' },
              { step: '02', text: 'Introdúcelo en el formulario y haz clic en unirme' },
              { step: '03', text: 'Accede al panel con estadísticas, rutinas y más' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A73E8]/20 text-[11px] font-black text-[#60a5fa]">
                  {step}
                </span>
                <p className="text-[13px] font-medium leading-snug text-slate-300 pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-10 pb-12 xl:px-14">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Formato del código</p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.2em] text-white">XXXX-XXXX</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Letras mayúsculas y números</p>
          </div>
        </div>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="auth-panel flex flex-1 items-center justify-center p-6">
        <div className={`w-full max-w-[420px] animate-slide-up ${shake ? 'shake' : ''} ${success ? 'pulse-success' : ''}`}>
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A73E8]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black italic tracking-tighter text-[#1A73E8]">BeProfesional</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[1.75rem] font-black tracking-tight text-[#181c20]">Únete al equipo</h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Introduce el código de invitación</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code inputs */}
            <div>
              <label className="mb-4 block text-[11px] font-black uppercase tracking-wider text-[#44474E]">
                Código de invitación
              </label>
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    value={codigo[i]}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    maxLength={1}
                    disabled={loading || success}
                    className="h-14 w-12 rounded-xl border-2 border-[#e8edf5] bg-white text-center font-mono text-xl font-black text-[#181c20] outline-none transition-all focus:border-[#1A73E8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                  />
                ))}

                <span className="text-xl font-bold text-[#c1c6d6]">—</span>

                {[4, 5, 6, 7].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    value={codigo[i]}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    maxLength={1}
                    disabled={loading || success}
                    className="h-14 w-12 rounded-xl border-2 border-[#e8edf5] bg-white text-center font-mono text-xl font-black text-[#181c20] outline-none transition-all focus:border-[#1A73E8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                  />
                ))}
              </div>

              <p className="mt-3 text-center text-xs font-medium text-slate-400">
                Vista previa:{' '}
                <span className="font-mono font-bold text-[#44474E]">{getFullCode()}</span>
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                ¡Te has unido al equipo!
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isCodeComplete || success}
              className="btn-premium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  ¡Unido!
                </>
              ) : (
                'Unirme al equipo'
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-[#e8edf5] pt-6">
            <p className="mb-4 text-center text-sm font-medium text-slate-500">¿No tienes un código?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/crear-equipo">
                <button className="btn-premium-outline w-full">Crear equipo</button>
              </Link>
              <Link href="/equipos">
                <button className="btn-premium-outline w-full">Mis equipos</button>
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm font-semibold text-[#1A73E8] hover:text-[#1557B0] transition-colors">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
