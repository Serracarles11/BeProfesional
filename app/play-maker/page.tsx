import { Suspense } from 'react'
import PlayMakerClient from './PlayMakerClient'

function PlayMakerFallback() {
  return <div className="min-h-screen bg-[#f7f9fe]" />
}

export default function PlayMakerPage() {
  return (
    <Suspense fallback={<PlayMakerFallback />}>
      <PlayMakerClient />
    </Suspense>
  )
}

