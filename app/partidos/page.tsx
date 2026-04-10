import { Suspense } from 'react'
import PartidosPage from './PartidosPage'

function PartidosFallback() {
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-4 py-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-4">
        <div className="h-24 rounded-3xl bg-[#dfe7f5]" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="h-72 rounded-3xl bg-[#dfe7f5]" />
            <div className="h-48 rounded-3xl bg-[#dfe7f5]" />
          </div>
          <div className="space-y-4 lg:col-span-4">
            <div className="h-40 rounded-3xl bg-[#dfe7f5]" />
            <div className="h-40 rounded-3xl bg-[#dfe7f5]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PartidosIndexPage() {
  return (
    <Suspense fallback={<PartidosFallback />}>
      <PartidosPage />
    </Suspense>
  )
}
