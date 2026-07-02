import { useCallback, useEffect, useState } from 'react'
import { getDayStamp } from '@/lib/today'
import { useIsDemo } from '@/lib/demoMode'
import { loadTodos, saveTodos, type TodoItem, type TodoState } from './store'

// هوك «مهام اليوم» — يقرأ/يكتب حالة الحساب، يضيف/يُبدّل/يحذف، ويُدوّر تلقائيًا
// عند تغيّر اليوم (عودة التركيز/الرؤية). في الوضع التجريبي لا نكتب للتخزين.

function fresh(): TodoState {
  return { date: getDayStamp(), items: [] }
}

// معرّف بسيط بلا اعتماد على Date.now (يكفي للتمييز محليًا) — كنمط بقيّة المخازن.
let seq = 0
function nextId(): string {
  seq += 1
  const t = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0
  return `todo-${seq}-${t}`
}

/**
 * @param ownerId معرّف الحساب المسجّل أو null للضيف — يحدّد عزل التخزين لكل حساب.
 */
export function useTodos(ownerId: string | null | undefined) {
  const demo = useIsDemo()
  const [state, setState] = useState<TodoState>(() => (demo ? fresh() : loadTodos(ownerId)))

  // عند تبديل الحساب (تسجيل دخول/خروج) أعِد التحميل من مفتاح الحساب الصحيح.
  useEffect(() => {
    setState(demo ? fresh() : loadTodos(ownerId))
  }, [ownerId, demo])

  const persist = useCallback(
    (s: TodoState) => {
      if (!demo) saveTodos(ownerId, s)
    },
    [ownerId, demo],
  )

  // تدوير عند تغيّر اليوم بينما الصفحة مفتوحة (بعد منتصف الليل مثلًا).
  useEffect(() => {
    const check = () => {
      const today = getDayStamp()
      setState((prev) => {
        if (prev.date === today) return prev
        const next = demo ? fresh() : loadTodos(ownerId)
        return next
      })
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [ownerId, demo])

  const add = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      const item: TodoItem = { id: nextId(), text: t, done: false }
      setState((prev) => {
        const next: TodoState = { date: getDayStamp(), items: [...prev.items, item] }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const toggle = useCallback(
    (id: string) => {
      setState((prev) => {
        const next: TodoState = {
          ...prev,
          items: prev.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
        }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const remove = useCallback(
    (id: string) => {
      setState((prev) => {
        const next: TodoState = { ...prev, items: prev.items.filter((it) => it.id !== id) }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const remaining = state.items.reduce((n, it) => (it.done ? n : n + 1), 0)

  return { state, items: state.items, remaining, add, toggle, remove }
}
