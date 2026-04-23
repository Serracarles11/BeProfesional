'use client'

type ErrorStateProps = {
  message: string
  onRetry: () => void
}

export function HomeLoadingState() {
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-4 py-6">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-4">
        <div className="h-16 rounded-2xl bg-[#dfe7f5]" />
        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_24rem]">
          <div className="h-[620px] rounded-2xl bg-[#dfe7f5]" />
          <div className="space-y-4">
            <div className="h-44 rounded-2xl bg-[#dfe7f5]" />
            <div className="h-40 rounded-2xl bg-[#dfe7f5]" />
            <div className="h-56 rounded-2xl bg-[#dfe7f5]" />
          </div>
          <div className="h-[620px] rounded-2xl bg-[#dfe7f5]" />
        </div>
      </div>
    </div>
  )
}

export function HomeErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-4 py-6">
      <div className="mx-auto flex max-w-2xl items-center justify-center pt-24">
        <div className="w-full rounded-2xl border border-[#c1c6d6] bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-[#181c20]">{message || 'No se pudo cargar Home'}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-full bg-[#005db6] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#004da0]"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}

export function HomeEmptyState() {
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-4 py-6">
      <div className="mx-auto flex max-w-2xl items-center justify-center pt-24">
        <div className="w-full rounded-2xl border border-[#c1c6d6] bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-extrabold text-[#181c20]">Sin equipo activo</p>
          <p className="mt-2 text-sm text-[#414754]">Unete a un equipo para ver el dashboard principal.</p>
        </div>
      </div>
    </div>
  )
}
