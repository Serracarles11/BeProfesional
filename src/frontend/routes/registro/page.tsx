'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'

const FEATURES = [
  'Genera rutinas de entrenamiento con IA en segundos',
  'Analiza estadísticas de rendimiento en tiempo real',
  'Gestiona tu equipo completo desde un panel unificado',
  'Comparte ejercicios y rutinas con otros entrenadores',
]

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password }),
      })
      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al registrarse')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }

      router.push(data.redirectTo || '/unirse')
      router.refresh()
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
            Empieza gratis
          </div>
          <h1 className="text-[2.6rem] font-black leading-[1.06] tracking-tight text-white xl:text-5xl">
            Tu equipo.<br />
            <span className="text-[#60a5fa]">Tu plataforma.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-slate-400">
            Todo lo que necesitas para entrenar mejor, analizar más y gestionar tu equipo sin fricción.
          </p>

          <ul className="mt-10 space-y-3">
            {FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" />
                <span className="text-[13px] font-medium text-slate-300">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 px-10 pb-12 xl:px-14">
          <blockquote className="border-l-2 border-[#1A73E8]/40 pl-4">
            <p className="text-[13px] font-medium italic text-slate-400">
              "La diferencia entre un buen entrenador y un gran entrenador son los datos."
            </p>
          </blockquote>
        </div>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="auth-panel flex flex-1 items-center justify-center p-6">
        <div className={`w-full max-w-[420px] animate-slide-up ${shake ? 'shake' : ''}`}>
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A73E8]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black italic tracking-tighter text-[#1A73E8]">BeProfesional</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[1.75rem] font-black tracking-tight text-[#181c20]">Crea tu cuenta</h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Empieza gratis, sin tarjeta de crédito</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombre" className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#44474E]">
                Nombre completo
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
                disabled={loading}
                className="input-premium"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#44474E]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={loading}
                className="input-premium"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[11px] font-black uppercase tracking-wider text-[#44474E]">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                required
                minLength={6}
                disabled={loading}
                className="input-premium"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-premium flex items-center justify-center gap-2"
              style={{ background: '#1A73E8' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-bold text-[#1A73E8] hover:text-[#1557B0] transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Al registrarte, aceptas nuestros{' '}
            <a href="#" className="font-semibold underline hover:text-slate-600 transition-colors">
              Términos de servicio
            </a>{' '}
            y{' '}
            <a href="#" className="font-semibold underline hover:text-slate-600 transition-colors">
              Política de privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
