'use client'

import { useEffect, useState } from 'react'

type ClubPanelMembership = {
  id: string
  role: string
  status: string
  clubId: string
  clubName: string
}

export function useClubPanelAccess() {
  const [membership, setMembership] = useState<ClubPanelMembership | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMembership() {
      try {
        const response = await fetch('/api/club/membership', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as
          | {
              ok?: boolean
              membership?: ClubPanelMembership | null
            }
          | null

        if (!cancelled && response.ok && data?.ok) {
          setMembership(data.membership ?? null)
        }
      } catch {
        if (!cancelled) setMembership(null)
      }
    }

    loadMembership()

    return () => {
      cancelled = true
    }
  }, [])

  return membership
}
