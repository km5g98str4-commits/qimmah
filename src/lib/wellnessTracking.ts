import { useCallback, useEffect, useState } from 'react'
import { getDayStamp } from './today'
import { useIsDemo } from './demoMode'

// تتبّع المكملات والأدوية اليومي — يُصفّر مع تغيّر اليوم.

export const WELLNESS_TODAY_KEY = 'qimmah:wellnessToday:v1'

export interface WellnessTodayState {
  date: string
  doneSupplements: Record<string, boolean>
  doneMedications: Record<string, boolean>
}

function fresh(): WellnessTodayState {
  return { date: getDayStamp(), doneSupplements: {}, doneMedications: {} }
}

export function loadWellnessToday(): WellnessTodayState {
  if (typeof window === 'undefined') return fresh()
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(WELLNESS_TODAY_KEY)
    if (raw) {
      const p = JSON.parse(raw) as WellnessTodayState
      if (p && p.date === today && p.doneSupplements && p.doneMedications) return p
    }
  } catch {
    /* تجاهل */
  }
  const f = fresh()
  window.localStorage.setItem(WELLNESS_TODAY_KEY, JSON.stringify(f))
  return f
}

export function saveWellnessToday(state: WellnessTodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WELLNESS_TODAY_KEY, JSON.stringify(state))
}

export function useWellnessToday() {
  const demo = useIsDemo()
  const [state, setState] = useState<WellnessTodayState>(() => (demo ? fresh() : loadWellnessToday()))
  const persist = (s: WellnessTodayState) => {
    if (!demo) saveWellnessToday(s)
  }

  useEffect(() => {
    const check = () => {
      const today = getDayStamp()
      setState((prev) => {
        if (prev.date === today) return prev
        const f = fresh()
        persist(f)
        return f
      })
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSupplement = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, doneSupplements: { ...prev.doneSupplements, [id]: !prev.doneSupplements[id] } }
      persist(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleMedication = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, doneMedications: { ...prev.doneMedications, [id]: !prev.doneMedications[id] } }
      persist(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSupplementDone = useCallback((id: string) => !!state.doneSupplements[id], [state])
  const isMedicationDone = useCallback((id: string) => !!state.doneMedications[id], [state])

  return { state, toggleSupplement, toggleMedication, isSupplementDone, isMedicationDone }
}
