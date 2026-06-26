import { useCallback, useEffect, useState } from 'react'
import { getDayStamp } from './today'

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
  const [state, setState] = useState<CommitmentsTodayState>(() => loadCommitmentsToday())

  useEffect(() => {
    const check = () => {
      const today = getDayStamp()
      setState((prev) => {
        if (prev.date === today) return prev
        const f = fresh()
        saveCommitmentsToday(f)
        return f
      })
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, done: { ...prev.done, [id]: !prev.done[id] } }
      saveCommitmentsToday(next)
      return next
    })
  }, [])

  const setNotes = useCallback((notes: string) => {
    setState((prev) => {
      const next = { ...prev, notes }
      saveCommitmentsToday(next)
      return next
    })
  }, [])

  const isDone = useCallback((id: string) => !!state.done[id], [state])

  return { state, toggle, setNotes, isDone }
}
