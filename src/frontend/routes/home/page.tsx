import { Suspense } from 'react'
import Home from './Home'

function HomeFallback() {
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

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <Home />
    </Suspense>
  )
}
