import { Suspense } from 'react'
import SquadPage from './SquadPage'

function SquadFallback() {
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-4 py-6">
      <div className="mx-auto max-w-[1700px] animate-pulse space-y-4">
        <div className="h-16 rounded-2xl bg-[#dfe7f5]" />
        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="h-[680px] rounded-2xl bg-[#dfe7f5]" />
          <div className="space-y-4">
            <div className="h-36 rounded-2xl bg-[#dfe7f5]" />
            <div className="h-[430px] rounded-2xl bg-[#dfe7f5]" />
            <div className="h-56 rounded-2xl bg-[#dfe7f5]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JugadoresPage() {
  return (
    <Suspense fallback={<SquadFallback />}>
      <SquadPage />
    </Suspense>
  )
}
