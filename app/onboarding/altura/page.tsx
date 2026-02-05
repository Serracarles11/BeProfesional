'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CM_TO_INCH = 0.393701
const MIN_CM = 120
const MAX_CM = 220

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm * CM_TO_INCH
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { feet, inches }
}

export default function AlturaPage() {
  const router = useRouter()
  const [alturaCm, setAlturaCm] = useState(175)
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const { feet, inches } = cmToFeetInches(alturaCm)
  const percentage = ((alturaCm - MIN_CM) / (MAX_CM - MIN_CM)) * 100

  const handleSliderChange = (clientX: number) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const percent = x / rect.width
    const newCm = Math.round(MIN_CM + percent * (MAX_CM - MIN_CM))
    setAlturaCm(Math.max(MIN_CM, Math.min(MAX_CM, newCm)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    handleSliderChange(e.clientX)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      handleSliderChange(e.clientX)
    }
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    handleSliderChange(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging.current) {
      handleSliderChange(e.touches[0].clientX)
    }
  }

  const handleTouchEnd = () => {
    isDragging.current = false
  }

  const handleContinue = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/altura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altura_cm: alturaCm }),
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al guardar')
        return
      }

      router.push('/onboarding/final')
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-3xl">📏</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            ¿Cuanto mides?
          </h1>
          <p className="text-gray-500 text-sm">
            Desliza para ajustar tu altura
          </p>
        </div>

        {/* Unit toggle */}
        <div className="flex justify-center mb-6">
          <div className="unit-toggle">
            <button
              onClick={() => setUnit('cm')}
              className={`unit-option ${unit === 'cm' ? 'active' : ''}`}
            >
              CM
            </button>
            <button
              onClick={() => setUnit('ft')}
              className={`unit-option ${unit === 'ft' ? 'active' : ''}`}
            >
              FT
            </button>
          </div>
        </div>

        {/* Height display */}
        <div className="text-center mb-8">
          {unit === 'cm' ? (
            <>
              <span className="value-display">{alturaCm}</span>
              <span className="value-unit">cm</span>
            </>
          ) : (
            <>
              <span className="value-display">{feet}</span>
              <span className="value-unit">ft</span>
              <span className="value-display ml-2">{inches}</span>
              <span className="value-unit">in</span>
            </>
          )}
        </div>

        {/* Height visualization */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-48 bg-gradient-to-t from-blue-100 to-indigo-50 rounded-2xl overflow-hidden">
            {/* Person silhouette */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t-full transition-all duration-150"
              style={{ height: `${percentage}%` }}
            >
              {/* Head */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="px-4 mb-6">
          <div
            ref={sliderRef}
            className="relative h-12 cursor-pointer"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full">
              {/* Fill */}
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-75"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 active:scale-115"
              style={{ left: `calc(${percentage}% - 16px)` }}
            />
          </div>

          {/* Min/Max labels */}
          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <span>{unit === 'cm' ? `${MIN_CM} cm` : "3'11\""}</span>
            <span>{unit === 'cm' ? `${MAX_CM} cm` : "7'2\""}</span>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[160, 170, 175, 180, 190].map((cm) => {
            const { feet: f, inches: i } = cmToFeetInches(cm)
            return (
              <button
                key={cm}
                onClick={() => setAlturaCm(cm)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  alturaCm === cm
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {unit === 'cm' ? `${cm}` : `${f}'${i}"`}
              </button>
            )
          })}
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
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)' }}
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
            href="/onboarding/peso"
            className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Anterior
          </Link>
        </div>
      </div>
    </div>
  )
}
