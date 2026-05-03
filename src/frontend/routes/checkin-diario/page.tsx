import { redirect } from 'next/navigation'

import { createSupabaseServer } from '@/lib/supabase/server'

import { DailyCheckinClient } from './DailyCheckinClient'

export const dynamic = 'force-dynamic'

export default async function DailyCheckinPage() {
  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return <DailyCheckinClient />
}
