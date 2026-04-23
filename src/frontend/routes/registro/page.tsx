'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
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
      <span className="floating-emoji" style={{ top: '8%', left: '8%' }}>
        🎽
      </span>
      <span
        className="floating-emoji"
        style={{ top: '15%', right: '10%', animationDelay: '-2s' }}
      >
        🏃
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '20%', left: '5%', animationDelay: '-4s' }}
      >
        💪
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '30%', right: '8%', animationDelay: '-1s' }}
      >
        🌟
      </span>
      <span
        className="floating-emoji"
        style={{ top: '45%', right: '3%', animationDelay: '-3s', fontSize: '1.5rem' }}
      >
        🎖️
      </span>

      <div
        className={`glass-card w-full max-w-md rounded-3xl p-8 md:p-10 relative z-10 animate-slide-up ${
          shake ? 'shake' : ''
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Unete ahora
          </h1>
          <p className="text-gray-500">Crea tu cuenta en segundos</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              required
              className="input-premium"
              disabled={loading}
            />
          </div>

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
              placeholder="Minimo 6 caracteres"
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
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creando cuenta...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center">
          <div className="text-gray-500 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              Inicia sesion
            </Link>
          </div>
        </div>

        {/* Terms */}
        <p className="mt-6 text-xs text-center text-gray-400">
          Al registrarte, aceptas nuestros{' '}
          <a href="#" className="underline hover:text-gray-600">
            Terminos de servicio
          </a>{' '}
          y{' '}
          <a href="#" className="underline hover:text-gray-600">
            Politica de privacidad
          </a>
        </p>
      </div>
    </div>
  )
}
