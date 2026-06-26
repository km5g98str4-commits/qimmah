import { useCallback, useEffect, useState } from 'react'

// حالة «اليوم» — علامات الإنجاز اليومية، تُحفظ محليًا وتُصفّر تلقائيًا عند تغيّر اليوم.
// نموذج بسيط: تاريخ اليوم + خريطة مفاتيح منجزة (key = "group:index").

export const TODAY_KEY = 'qimmah:today:v1'

export interface TodayState {
  date: string // ختم اليوم المحلي YYYY-MM-DD
  done: Record<string, boolean>
}

/** ختم اليوم المحلي (YYYY-MM-DD) — أساس التصفير اليومي. */
export function getDayStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function freshState(): TodayState {
  return { date: getDayStamp(), done: {} }
}

/** يقرأ حالة اليوم؛ وإن كان المحفوظ ليوم سابق يبدأ صفحة جديدة (تصفير). */
export function loadToday(): TodayState {
  if (typeof window === 'undefined') return freshState()
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(TODAY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TodayState
      if (parsed && parsed.date === today && parsed.done) return parsed
    }
  } catch {
    /* تجاهل البيانات التالفة */
  }
  const fresh = freshState()
  window.localStorage.setItem(TODAY_KEY, JSON.stringify(fresh))
  return fresh
}

export function saveToday(state: TodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TODAY_KEY, JSON.stringify(state))
}

/** هوك حالة اليوم: تبديل العلامات + تصفير يومي تلقائي. */
export function useToday() {
  const [state, setState] = useState<TodayState>(() => loadToday())

  // تحقّق من تغيّر اليوم عند العودة للصفحة (لو بقيت مفتوحة بعد منتصف الليل)
  useEffect(() => {
    const check = () => {
      const today = getDayStamp()
      setState((prev) => {
        if (prev.date === today) return prev
        const fresh = freshState()
        saveToday(fresh)
        return fresh
      })
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  const toggle = useCallback((key: string) => {
    setState((prev) => {
      const next: TodayState = { ...prev, done: { ...prev.done, [key]: !prev.done[key] } }
      saveToday(next)
      return next
    })
  }, [])

  const resetDay = useCallback(() => {
    const fresh = freshState()
    saveToday(fresh)
    setState(fresh)
  }, [])

  const isDone = useCallback((key: string) => !!state.done[key], [state])

  return { state, toggle, resetDay, isDone }
}
