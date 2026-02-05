'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const KG_TO_LB = 2.20462
const MIN_KG = 30
const MAX_KG = 200

export default function PesoPage() {
  const router = useRouter()
  const [pesoKg, setPesoKg] = useState(70)
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const displayValue = unit === 'kg' ? pesoKg : Math.round(pesoKg * KG_TO_LB)
  const minDisplay = unit === 'kg' ? MIN_KG : Math.round(MIN_KG * KG_TO_LB)
  const maxDisplay = unit === 'kg' ? MAX_KG : Math.round(MAX_KG * KG_TO_LB)

  const percentage = ((pesoKg - MIN_KG) / (MAX_KG - MIN_KG)) * 100

  const handleSliderChange = (clientX: number) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const percent = x / rect.width
    const newKg = Math.round(MIN_KG + percent * (MAX_KG - MIN_KG))
    setPesoKg(Math.max(MIN_KG, Math.min(MAX_KG, newKg)))
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
      const res = await fetch('/api/onboarding/peso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso_kg: pesoKg }),
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al guardar')
        return
      }

      router.push('/onboarding/altura')
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
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-3xl">⚖️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            ¿Cual es tu peso?
          </h1>
          <p className="text-gray-500 text-sm">
            Desliza para ajustar
          </p>
        </div>

        {/* Unit toggle */}
        <div className="flex justify-center mb-6">
          <div className="unit-toggle">
            <button
              onClick={() => setUnit('kg')}
              className={`unit-option ${unit === 'kg' ? 'active' : ''}`}
            >
              KG
            </button>
            <button
              onClick={() => setUnit('lb')}
              className={`unit-option ${unit === 'lb' ? 'active' : ''}`}
            >
              LB
            </button>
          </div>
        </div>

        {/* Weight display */}
        <div className="text-center mb-8">
          <span className="value-display">{displayValue}</span>
          <span className="value-unit">{unit}</span>
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
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-75"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 active:scale-115"
              style={{ left: `calc(${percentage}% - 16px)` }}
            />
          </div>

          {/* Min/Max labels */}
          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <span>{minDisplay} {unit}</span>
            <span>{maxDisplay} {unit}</span>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[50, 60, 70, 80, 90].map((kg) => (
            <button
              key={kg}
              onClick={() => setPesoKg(kg)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pesoKg === kg
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              {unit === 'kg' ? kg : Math.round(kg * KG_TO_LB)} {unit}
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
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}
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
            href="/onboarding/edad"
            className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Anterior
          </Link>
        </div>
      </div>
    </div>
  )
}
