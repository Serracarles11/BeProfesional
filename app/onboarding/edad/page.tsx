'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MIN_AGE = 10
const MAX_AGE = 80
const ITEM_HEIGHT = 50

export default function EdadPage() {
  const router = useRouter()
  const [edad, setEdad] = useState(25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)

  const ages = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i)

  const scrollToAge = useCallback((age: number, smooth = true) => {
    if (scrollRef.current) {
      const index = age - MIN_AGE
      scrollRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }, [])

  useEffect(() => {
    // Initial scroll to default age
    scrollToAge(edad, false)
  }, [edad, scrollToAge])

  const handleScroll = () => {
    if (scrollRef.current && !isScrolling.current) {
      const scrollTop = scrollRef.current.scrollTop
      const index = Math.round(scrollTop / ITEM_HEIGHT)
      const newAge = Math.min(MAX_AGE, Math.max(MIN_AGE, MIN_AGE + index))
      if (newAge !== edad) {
        setEdad(newAge)
      }
    }
  }

  const handleScrollEnd = () => {
    // Snap to nearest age
    scrollToAge(edad)
  }

  const handleContinue = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/edad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edad }),
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al guardar')
        return
      }

      router.push('/onboarding/peso')
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
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-3xl">🎂</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            ¿Cuantos anos tienes?
          </h1>
          <p className="text-gray-500 text-sm">
            Desliza para seleccionar tu edad
          </p>
        </div>

        {/* Age display */}
        <div className="text-center mb-6">
          <span className="value-display">{edad}</span>
          <span className="value-unit">anos</span>
        </div>

        {/* Wheel picker */}
        <div className="relative mx-auto" style={{ width: '200px', height: '200px' }}>
          {/* Highlight bar */}
          <div className="wheel-highlight" />

          {/* Gradient masks */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

          {/* Scrollable area */}
          <div
            ref={scrollRef}
            className="wheel-picker"
            onScroll={handleScroll}
            onTouchEnd={handleScrollEnd}
            onMouseUp={handleScrollEnd}
            style={{ paddingTop: '75px', paddingBottom: '75px' }}
          >
            {ages.map((age) => (
              <div
                key={age}
                className={`wheel-item ${age === edad ? 'active' : ''}`}
                onClick={() => {
                  setEdad(age)
                  scrollToAge(age)
                }}
              >
                {age}
              </div>
            ))}
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="flex justify-center gap-2 mt-6">
          {[18, 25, 30, 40].map((age) => (
            <button
              key={age}
              onClick={() => {
                setEdad(age)
                scrollToAge(age)
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                edad === age
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              {age}
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
            disabled={loading}
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
            href="/onboarding/genero"
            className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Anterior
          </Link>
        </div>
      </div>
    </div>
  )
}
