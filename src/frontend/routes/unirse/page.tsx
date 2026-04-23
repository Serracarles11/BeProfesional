'use client'

import { useState, FormEvent, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UnirsePage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState(['', '', '', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Formato: XXXX-XXXX (8 caracteres)
  const handleInputChange = (index: number, value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (sanitized.length > 1) return

    const newCodigo = [...codigo]
    newCodigo[index] = sanitized
    setCodigo(newCodigo)

    // Auto-focus siguiente input
    if (sanitized && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8)

    const newCodigo = [...codigo]
    for (let i = 0; i < pasted.length; i++) {
      newCodigo[i] = pasted[i]
    }
    setCodigo(newCodigo)

    // Focus al ultimo input lleno o al siguiente vacio
    const lastFilledIndex = Math.min(pasted.length - 1, 7)
    inputRefs.current[lastFilledIndex]?.focus()
  }

  const getFullCode = () => {
    return codigo.slice(0, 4).join('') + '-' + codigo.slice(4).join('')
  }

  const isCodeComplete = codigo.every((c) => c !== '')

  const handleSubmit = async (e: FormEvent) => {
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
        setError(data.error || 'Codigo invalido')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(data.redirectTo || '/equipos')
        router.refresh()
      }, 1000)
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
      <span className="floating-emoji" style={{ top: '12%', left: '6%' }}>
        🤝
      </span>
      <span
        className="floating-emoji"
        style={{ top: '18%', right: '12%', animationDelay: '-2s' }}
      >
        👥
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '18%', left: '8%', animationDelay: '-4s' }}
      >
        🎯
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '25%', right: '6%', animationDelay: '-1s' }}
      >
        🏅
      </span>
      <span
        className="floating-emoji"
        style={{ top: '55%', left: '4%', animationDelay: '-3s', fontSize: '1.5rem' }}
      >
        ⚡
      </span>

      <div
        className={`glass-card w-full max-w-md rounded-3xl p-8 md:p-10 relative z-10 animate-slide-up ${
          shake ? 'shake' : ''
        } ${success ? 'pulse-success' : ''}`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-3xl">🎫</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Unete a un equipo
          </h1>
          <p className="text-gray-500">Introduce el codigo de invitacion</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Code inputs */}
          <div className="flex items-center justify-center gap-1 md:gap-2">
            {/* First 4 digits */}
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el
                }}
                type="text"
                value={codigo[i]}
                onChange={(e) => handleInputChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                maxLength={1}
                disabled={loading || success}
                className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl
                           border-2 border-gray-200 bg-white/80
                           focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100
                           transition-all duration-200
                           disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            ))}

            {/* Separator */}
            <span className="text-2xl font-bold text-gray-300 mx-1">-</span>

            {/* Last 4 digits */}
            {[4, 5, 6, 7].map((i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el
                }}
                type="text"
                value={codigo[i]}
                onChange={(e) => handleInputChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                maxLength={1}
                disabled={loading || success}
                className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl
                           border-2 border-gray-200 bg-white/80
                           focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100
                           transition-all duration-200
                           disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            ))}
          </div>

          {/* Code preview */}
          <p className="text-center text-sm text-gray-400">
            Codigo:{' '}
            <span className="font-mono font-semibold text-gray-600">
              {getFullCode()}
            </span>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm text-center">
              ¡Te has unido al equipo!
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isCodeComplete || success}
            className="btn-premium flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Verificando...
              </>
            ) : success ? (
              '¡Unido!'
            ) : (
              'Unirme al equipo'
            )}
          </button>
        </form>

        {/* Alternative actions */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-gray-500 text-sm mb-4">
            ¿No tienes un codigo?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/crear-equipo" className="flex-1">
              <button className="btn-premium-outline w-full text-sm">
                Crear mi equipo
              </button>
            </Link>
            <Link href="/equipos" className="flex-1">
              <button className="btn-premium-outline w-full text-sm">
                Mis equipos
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
