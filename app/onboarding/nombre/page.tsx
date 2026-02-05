'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const posiciones = [
  { value: 'PORTERO', label: 'Portero', icon: '🧤' },
  { value: 'DEFENSA', label: 'Defensa', icon: '🛡️' },
  { value: 'MEDIO', label: 'Medio', icon: '⚙️' },
  { value: 'DELANTERO', label: 'Delantero', icon: '⚡' },
]

const piesDominantes = [
  { value: 'DERECHO', label: 'Derecho', icon: '👟' },
  { value: 'IZQUIERDO', label: 'Izquierdo', icon: '👟' },
  { value: 'AMBOS', label: 'Ambos', icon: '🦶' },
]

export default function NombrePage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [posicion, setPosicion] = useState('')
  const [pieDominante, setPieDominante] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/nombre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          posicion: posicion || null,
          pie_dominante: pieDominante || null,
        }),
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Error al guardar')
        return
      }

      router.push('/onboarding/genero')
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
          <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            ¿Como te llamas?
          </h1>
          <p className="text-gray-500 text-sm">
            Cuentanos un poco sobre ti
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Carlos Garcia"
              className="input-premium"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Posicion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Posicion favorita <span className="text-gray-400">(opcional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {posiciones.map((pos) => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => setPosicion(posicion === pos.value ? '' : pos.value)}
                  disabled={loading}
                  className={`option-card ${posicion === pos.value ? 'selected' : ''}`}
                >
                  <span className={`icon ${posicion === pos.value ? 'text-white' : ''}`}>
                    {pos.icon}
                  </span>
                  <span className="font-medium text-sm">{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pie dominante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pie dominante <span className="text-gray-400">(opcional)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {piesDominantes.map((pie, index) => (
                <button
                  key={pie.value}
                  type="button"
                  onClick={() => setPieDominante(pieDominante === pie.value ? '' : pie.value)}
                  disabled={loading}
                  className={`option-card flex-col py-3 ${index === 2 ? 'col-span-2 sm:col-span-1' : ''} ${pieDominante === pie.value ? 'selected' : ''}`}
                >
                  <span className={`icon ${pieDominante === pie.value ? 'text-white' : ''} ${pie.value === 'IZQUIERDO' ? 'scale-x-[-1]' : ''}`}>
                    {pie.icon}
                  </span>
                  <span className="font-medium text-xs">{pie.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Bottom nav */}
      <div className="onboarding-nav">
        <div className="onboarding-nav-inner">
          <button
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
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
        </div>
      </div>
    </div>
  )
}
