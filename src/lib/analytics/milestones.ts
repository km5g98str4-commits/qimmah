// معالم «أول مرّة» — تدعم أحداث التفعيل first_workout_logged / first_meal_logged.
// كل معلم يُطلق مرّة واحدة فقط لكل جهاز، ويُمسح مع resetQimmah.

export const MILESTONES_KEY = 'qimmah:analytics:milestones:v1'

export type Milestone = 'firstWorkout' | 'firstMeal'

function load(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(MILESTONES_KEY)
    const p = raw ? (JSON.parse(raw) as unknown) : {}
    return p && typeof p === 'object' ? (p as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function save(store: Record<string, boolean>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MILESTONES_KEY, JSON.stringify(store))
  } catch {
    /* تجاهل */
  }
}

/**
 * يُرجع true **أول** مرّة يُستدعى لهذا المعلم (ويعلّمه)، ثم false دائمًا بعدها.
 * الاستخدام: `if (firstOnce('firstWorkout')) track('first_workout_logged', {})`.
 */
export function firstOnce(milestone: Milestone): boolean {
  const store = load()
  if (store[milestone]) return false
  store[milestone] = true
  save(store)
  return true
}
