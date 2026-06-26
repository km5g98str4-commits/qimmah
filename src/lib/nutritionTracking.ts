import { useCallback, useEffect, useState } from 'react'
import { getDayStamp } from './today'

// تتبّع التغذية اليومي — وجبات منجزة + كمية الماء، يُصفّر مع تغيّر اليوم.

export const NUTRITION_TODAY_KEY = 'qimmah:nutritionToday:v1'

export interface NutritionTodayState {
  date: string
  doneMeals: Record<string, boolean>
  waterMl: number
}

function fresh(): NutritionTodayState {
  return { date: getDayStamp(), doneMeals: {}, waterMl: 0 }
}

export function loadNutritionToday(): NutritionTodayState {
  if (typeof window === 'undefined') return fresh()
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(NUTRITION_TODAY_KEY)
    if (raw) {
      const p = JSON.parse(raw) as NutritionTodayState
      if (p && p.date === today && p.doneMeals) return { date: today, doneMeals: p.doneMeals, waterMl: p.waterMl || 0 }
    }
  } catch {
    /* تجاهل */
  }
  const f = fresh()
  window.localStorage.setItem(NUTRITION_TODAY_KEY, JSON.stringify(f))
  return f
}

export function saveNutritionToday(state: NutritionTodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NUTRITION_TODAY_KEY, JSON.stringify(state))
}

/** هوك تتبّع التغذية اليومي مع تصفير عند تغيّر اليوم. */
export function useNutritionToday() {
  const [state, setState] = useState<NutritionTodayState>(() => loadNutritionToday())

  useEffect(() => {
    const check = () => {
      const today = getDayStamp()
      setState((prev) => {
        if (prev.date === today) return prev
        const f = fresh()
        saveNutritionToday(f)
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

  const toggleMeal = useCallback((mealId: string) => {
    setState((prev) => {
      const next = { ...prev, doneMeals: { ...prev.doneMeals, [mealId]: !prev.doneMeals[mealId] } }
      saveNutritionToday(next)
      return next
    })
  }, [])

  const addWater = useCallback((ml: number) => {
    setState((prev) => {
      const next = { ...prev, waterMl: Math.max(0, prev.waterMl + ml) }
      saveNutritionToday(next)
      return next
    })
  }, [])

  const resetWater = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, waterMl: 0 }
      saveNutritionToday(next)
      return next
    })
  }, [])

  const isMealDone = useCallback((mealId: string) => !!state.doneMeals[mealId], [state])

  return { state, toggleMeal, addWater, resetWater, isMealDone }
}
