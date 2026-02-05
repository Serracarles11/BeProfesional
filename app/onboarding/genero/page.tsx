'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const generos = [
  { value: 'HOMBRE', label: 'Hombre', icon: '👨', color: 'from-blue-400 to-blue-600' },
  { value: 'MUJER', label: 'Mujer', icon: '👩', color: 'from-pink-400 to-pink-600' },
  { value: 'NO_BINARIO', label: 'No binario', icon: '🧑', color: 'from-purple-400 to-purple-600' },
  { value: 'PREFIERO_NO_DECIR', label: 'Prefiero no decir', icon: '🤐', color: 'from-gray-400 to-gray-600' },
]

export default function GeneroPage() {
  const router = useRouter()
  const [genero, setGenero] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = async () => {
    if (!genero) {
      setError('Selecciona una opcion')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/genero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genero }),
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al guardar')
        return
      }

      router.push('/onboarding/edad')
    } catch {
      setError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div className="onboarding-card p-6 md:p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <span className="text-3xl">⚧️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            ¿Cual es tu genero?
          </h1>
          <p className="text-gray-500 text-sm">
            Selecciona la opcion con la que te identifies
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {generos.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGenero(g.value)}
              disabled={loading}
              className={`w-full option-card ${genero === g.value ? 'selected' : ''}`}
            >
              <div
                className={`icon ${
                  genero === g.value
                    ? `bg-gradient-to-br ${g.color} text-white`
                    : ''
                }`}
              >
                {g.icon}
              </div>
              <span className="font-medium flex-1 text-left">{g.label}</span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  genero === g.value
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}
              >
                {genero === g.value && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="onboarding-nav">
        <div className="onboarding-nav-inner">
          <button
            onClick={handleContinue}
            disabled={loading || !genero}
            className="btn-premium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Guardando...
              </>
            ) : (
              'Continuar'
            )}
          </button>
          <Link
            href="/onboarding/nombre"
            className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Anterior
          </Link>
        </div>
      </div>
    </div>
  )
}
