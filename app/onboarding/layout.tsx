'use client'

import { usePathname } from 'next/navigation'

const steps = [
  { path: '/onboarding/nombre', label: 'Nombre' },
  { path: '/onboarding/genero', label: 'Genero' },
  { path: '/onboarding/edad', label: 'Edad' },
  { path: '/onboarding/peso', label: 'Peso' },
  { path: '/onboarding/altura', label: 'Altura' },
  { path: '/onboarding/final', label: 'Final' },
]

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentStepIndex = steps.findIndex((s) => s.path === pathname)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className="onboarding-bg min-h-screen flex flex-col">
      {/* Emojis flotantes */}
      <span className="floating-emoji" style={{ top: '5%', left: '5%' }}>
        💪
      </span>
      <span className="floating-emoji" style={{ top: '15%', right: '8%', animationDelay: '-2s' }}>
        🏃
      </span>
      <span className="floating-emoji" style={{ bottom: '20%', left: '8%', animationDelay: '-4s' }}>
        ⚡
      </span>
      <span className="floating-emoji" style={{ bottom: '30%', right: '5%', animationDelay: '-1s' }}>
        🎯
      </span>
      <span className="floating-emoji" style={{ top: '50%', left: '3%', animationDelay: '-3s', fontSize: '1.5rem' }}>
        ✨
      </span>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-2">
            {steps.slice(0, -1).map((step, index) => (
              <div key={step.path} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    index < currentStepIndex
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                {index < steps.length - 2 && (
                  <div
                    className={`w-8 sm:w-12 h-1 mx-1 rounded-full transition-all duration-300 ${
                      index < currentStepIndex ? 'bg-emerald-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start md:items-center justify-center overflow-y-auto p-4 pt-24 pb-40 md:pb-28">
        {children}
      </main>
    </div>
  )
}
