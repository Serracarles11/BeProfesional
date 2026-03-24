import { Suspense } from 'react'
import SettingsClient from './SettingsClient'

function SettingsFallback() {
  return (
    <div className="min-h-screen bg-[#e7ebf3] p-4">
      <div className="mx-auto max-w-[1250px] rounded-2xl bg-white p-8">Cargando ajustes...</div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsClient />
    </Suspense>
  )
}
