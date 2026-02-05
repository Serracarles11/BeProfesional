'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FinalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Trigger confetti animation
    setTimeout(() => setShowConfetti(true), 300)
  }, [])

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al completar')
        return
      }

      router.push(data.redirectTo || '/equipos')
      router.refresh()
    } catch {
      setError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="onboarding-card p-8 md:p-10 relative z-10 overflow-visible">
        {/* Confetti emojis */}
        {showConfetti && (
          <>
            <span className="absolute -top-4 left-4 text-2xl confetti" style={{ animationDelay: '0s' }}>🎉</span>
            <span className="absolute -top-6 right-8 text-2xl confetti" style={{ animationDelay: '0.1s' }}>⭐</span>
            <span className="absolute -top-3 left-1/2 text-2xl confetti" style={{ animationDelay: '0.2s' }}>🎊</span>
            <span className="absolute -top-5 right-4 text-2xl confetti" style={{ animationDelay: '0.15s' }}>✨</span>
            <span className="absolute -top-4 left-12 text-2xl confetti" style={{ animationDelay: '0.25s' }}>🌟</span>
          </>
        )}

        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-emerald-500/40 success-icon">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Perfil completado!
          </h1>
          <p className="text-gray-500">
            Ya estas listo para empezar
          </p>
        </div>

        {/* Stats summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Tu perfil
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">👤</div>
              <div className="text-xs text-gray-500">Datos personales</div>
              <div className="text-emerald-500 text-sm font-medium">✓ Completado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xs text-gray-500">Medidas</div>
              <div className="text-emerald-500 text-sm font-medium">✓ Completado</div>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <span className="text-lg">🏟️</span>
            </div>
            <div>
              <div className="font-medium text-gray-800 text-sm">Siguiente paso</div>
              <div className="text-xs text-gray-500">Unete a tu primer equipo</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="onboarding-nav">
        <div className="onboarding-nav-inner">
          <button
            onClick={handleComplete}
            disabled={loading}
            className="btn-premium flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Finalizando...
              </>
            ) : (
              <>
                ¡Empezar!
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
