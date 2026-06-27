import { useCallback, useEffect, useState } from 'react'
import { getDayStamp } from './today'
import { useIsDemo } from './demoMode'
import { saveDailyLog } from './historyStore'

// تتبّع الالتزامات اليومي — يُصفّر مع تغيّر اليوم.

export const COMMITMENTS_TODAY_KEY = 'qimmah:commitmentsToday:v1'

export interface CommitmentsTodayState {
  date: string
  done: Record<string, boolean>
  notes?: string
}

function fresh(): CommitmentsTodayState {
  return { date: getDayStamp(), done: {}, notes: '' }
}

export function loadCommitmentsToday(): CommitmentsTodayState {
  if (typeof window === 'undefined') return fresh()
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(COMMITMENTS_TODAY_KEY)
    if (raw) {
      const p = JSON.parse(raw) as CommitmentsTodayState
      if (p && p.date === today && p.done) return { date: today, done: p.done, notes: p.notes ?? '' }
    }
  } catch {
    /* تجاهل */
  }
  const f = fresh()
  window.localStorage.setItem(COMMITMENTS_TODAY_KEY, JSON.stringify(f))
  return f
}

export function saveCommitmentsToday(state: CommitmentsTodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COMMITMENTS_TODAY_KEY, JSON.stringify(state))
}

export function useCommitmentsToday() {
  const demo = useIsDemo()
  const [state, setState] = useState<CommitmentsTodayState>(() => (demo ? fresh() : loadCommitmentsToday()))
  const persist = (s: CommitmentsTodayState) => {
    if (demo) return
    saveCommitmentsToday(s)
    // عكس في المتجر التاريخي الدائم كجزء من اللقطة اليومية.
    saveDailyLog(s.date, { commitments: { done: s.done, notes: s.notes } })
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

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, done: { ...prev.done, [id]: !prev.done[id] } }
      persist(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setNotes = useCallback((notes: string) => {
    setState((prev) => {
      const next = { ...prev, notes }
      persist(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDone = useCallback((id: string) => !!state.done[id], [state])

  return { state, toggle, setNotes, isDone }
}
