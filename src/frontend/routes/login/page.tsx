'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Dumbbell, Loader2, Sparkles, Users } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fe]">
      <Loader2 className="h-5 w-5 animate-spin text-[#1A73E8]" />
    </div>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, redirectTo }),
      })
      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al iniciar sesión')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }

      router.push(data.redirectTo || '/equipos')
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
      <div className="auth-hero hidden flex-col justify-between lg:flex lg:w-[52%] xl:w-[58%]">
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
            Plataforma deportiva
          </div>
          <h1 className="text-[2.8rem] font-black leading-[1.06] tracking-tight text-white xl:text-5xl">
            Entrena con datos.<br />
            <span className="text-[#60a5fa]">Evoluciona.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-slate-400">
            Genera rutinas con IA, analiza el rendimiento del equipo y gestiona cada entrenamiento desde un solo lugar.
          </p>

          <div className="mt-10 grid max-w-sm grid-cols-3 gap-3">
            {[
              { icon: Dumbbell, label: 'Rutinas IA', sub: 'Generadas con IA' },
              { icon: BarChart2, label: 'Estadisticas', sub: 'Datos en tiempo real' },
              { icon: Users, label: 'Equipo', sub: 'Toda la plantilla' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A73E8]/20">
                  <Icon className="h-4 w-4 text-[#60a5fa]" />
                </div>
                <p className="text-[13px] font-bold text-white">{label}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: tactical field preview */}
        <div className="relative z-10 mt-10 h-36 overflow-hidden opacity-20">
          <TacticalBoardMini />
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
            <h2 className="text-[1.75rem] font-black tracking-tight text-[#181c20]">Bienvenido</h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Inicia sesión en tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-[11px] font-black uppercase tracking-wider text-[#44474E]">
                  Contrasena
                </label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-[#1A73E8] hover:text-[#1557B0] transition-colors">
                  ¿Olvidaste tu contrasena?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

            <button type="submit" disabled={loading} className="btn-premium flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="font-bold text-[#1A73E8] hover:text-[#1557B0] transition-colors">
                Registrate
              </Link>
            </p>
          </div>

          <div className="mt-10 border-t border-[#e8edf5] pt-6">
            <p className="text-center text-[11px] font-medium text-slate-400">
              ¿Tienes un código de equipo?{' '}
              <Link href="/unirse" className="font-bold text-[#1A73E8] hover:text-[#1557B0] transition-colors">
                Unirte directamente
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TacticalBoardMini() {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 800 144"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <marker id="lgarrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0.5 L4.5,2.5 L0,4.5 Z" fill="rgba(253,224,71,0.7)" />
        </marker>
      </defs>
      <rect x="0" y="0" width="800" height="144" fill="#166a42" />
      <line x1="400" y1="0" x2="400" y2="144" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <circle cx="400" cy="72" r="36" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <rect x="0" y="36" width="72" height="72" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <rect x="728" y="36" width="72" height="72" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      {[
        [44, 72, '#60a5fa', '#1e40af'], [168, 30, '#60a5fa', '#1e40af'], [168, 72, '#60a5fa', '#1e40af'],
        [168, 114, '#60a5fa', '#1e40af'], [290, 48, '#60a5fa', '#1e40af'], [290, 96, '#60a5fa', '#1e40af'],
        [756, 72, '#f8fafc', '#64748b'], [632, 30, '#f8fafc', '#64748b'], [632, 72, '#f8fafc', '#64748b'],
        [632, 114, '#f8fafc', '#64748b'], [510, 50, '#f8fafc', '#64748b'], [510, 94, '#f8fafc', '#64748b'],
      ].map(([x, y, fill, stroke], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="8" fill={fill as string} stroke={stroke as string} strokeWidth="2" />
      ))}
      <circle cx="400" cy="70" r="5.5" fill="white" stroke="#4b5563" strokeWidth="1.5" />
      <path d="M290 48 C330 44, 365 52, 395 68" fill="none" stroke="rgba(253,224,71,0.65)" strokeDasharray="6 4" strokeWidth="2" markerEnd="url(#lgarrow)" />
    </svg>
  )
}
