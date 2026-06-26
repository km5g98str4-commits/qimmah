// حالة الإعداد الأولي (onboarding) — تتحكّم بفتح المعالج تلقائيًا أول زيارة.
// منفصلة تمامًا عن بيانات التخصيص: إعادة التشغيل لا تمسح بيانات المستخدم.

export const ONBOARDING_KEY = 'qimmah:onboarding:v1'

export interface OnboardingState {
  completed: boolean
  completedAt?: string
  lastStep?: number
}

const DEFAULT: OnboardingState = { completed: false }

export function loadOnboarding(): OnboardingState {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    return { completed: !!parsed.completed, completedAt: parsed.completedAt, lastStep: parsed.lastStep }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveOnboarding(state: OnboardingState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state))
}

/** يحدّث آخر خطوة دون المساس بحالة الإكمال (يُستخدم أثناء التنقّل/الحفظ المؤقت). */
export function setLastStep(step: number): void {
  const prev = loadOnboarding()
  saveOnboarding({ ...prev, lastStep: step })
}

/** يضع علامة الإكمال مع وقت الإكمال. */
export function markCompleted(step?: number): void {
  const prev = loadOnboarding()
  saveOnboarding({
    ...prev,
    completed: true,
    completedAt: new Date().toISOString(),
    lastStep: step ?? prev.lastStep,
  })
}

/** يعيد تشغيل الإعداد الأولي — يلغي الإكمال فقط دون مسح بيانات التخصيص. */
export function restartOnboarding(): void {
  saveOnboarding({ completed: false, lastStep: 0 })
}
