'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al iniciar sesion')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }

      router.push(data.redirectTo || '/equipos')
      router.refresh()
    } catch {
      setError('Error de conexion')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      {/* Emojis flotantes decorativos */}
      <span className="floating-emoji" style={{ top: '10%', left: '5%' }}>
        ⚽
      </span>
      <span
        className="floating-emoji"
        style={{ top: '20%', right: '8%', animationDelay: '-2s' }}
      >
        🏀
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '15%', left: '10%', animationDelay: '-4s' }}
      >
        🎯
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '25%', right: '5%', animationDelay: '-1s' }}
      >
        🏆
      </span>
      <span
        className="floating-emoji"
        style={{ top: '50%', left: '3%', animationDelay: '-3s', fontSize: '1.5rem' }}
      >
        ⭐
      </span>

      <div
        className={`glass-card w-full max-w-md rounded-3xl p-8 md:p-10 relative z-10 animate-slide-up ${
          shake ? 'shake' : ''
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Bienvenido
          </h1>
          <p className="text-gray-500">Inicia sesion en tu cuenta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="input-premium"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="input-premium"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-premium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-3">
          <Link
            href="/forgot-password"
            className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors block"
          >
            ¿Olvidaste tu contrasena?
          </Link>

          <div className="text-gray-500 text-sm">
            ¿No tienes cuenta?{' '}
            <Link
              href="/registro"
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Registrate
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
