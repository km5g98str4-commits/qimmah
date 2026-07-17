import { useCallback, useEffect, useState } from 'react'
import { useIsDemo } from './demoMode'
import { saveDailyLog } from './historyStore'

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

/** اسم يوم الأسبوع بالعربية/الإنجليزية (مثال: «الأحد» / «Sunday»). */
export function weekdayName(lang: 'ar' | 'en', d = new Date()): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar', { weekday: 'long' }).format(d)
  } catch {
    const ar = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return (lang === 'en' ? en : ar)[d.getDay()]
  }
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
  // بذر الحالة الطازجة best-effort: التحميل يجب ألّا يرمي عند امتلاء التخزين
  // (وإلّا انهارت الشاشة عبر ErrorBoundary لمجرّد فتحها). النمط نفسه في historyStore.
  try {
    window.localStorage.setItem(TODAY_KEY, JSON.stringify(fresh))
  } catch {
    /* تجاهل امتلاء/حجب التخزين — الحالة الطازجة تبقى في الذاكرة */
  }
  return fresh
}

export function saveToday(state: TodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TODAY_KEY, JSON.stringify(state))
}

/** هوك حالة اليوم: تبديل العلامات + تصفير يومي تلقائي. */
export function useToday() {
  const demo = useIsDemo()
  const [state, setState] = useState<TodayState>(() => (demo ? freshState() : loadToday()))
  const persist = (s: TodayState) => {
    if (demo) return
    saveToday(s)
    // عكس علامات اليوم في المتجر التاريخي الدائم.
    saveDailyLog(s.date, { done: s.done })
  }

  // تحقّق من تغيّر اليوم عند العودة للصفحة (لو بقيت مفتوحة بعد منتصف الليل)
  useEffect(() => {
    const check = () => {
      const today = getDayStamp()
      setState((prev) => {
        if (prev.date === today) return prev
        const fresh = freshState()
        persist(fresh)
        return fresh
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

  const toggle = useCallback((key: string) => {
    setState((prev) => {
      const next: TodayState = { ...prev, done: { ...prev.done, [key]: !prev.done[key] } }
      persist(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetDay = useCallback(() => {
    const fresh = freshState()
    persist(fresh)
    setState(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDone = useCallback((key: string) => !!state.done[key], [state])

  return { state, toggle, resetDay, isDone }
}
