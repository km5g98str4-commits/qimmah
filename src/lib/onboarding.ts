import { safeWriteJson } from '@/lib/safeStorage'
// حالة الإعداد الأولي (onboarding) — تتحكّم بفتح المعالج تلقائيًا أول زيارة.
// منفصلة تمامًا عن بيانات التخصيص: إعادة التشغيل لا تمسح بيانات المستخدم.
//
// مهم: إكمال الإعداد يُقاس **لكل حساب** لا لكل جهاز. حساب جديد يسجّل الدخول على
// جهاز سبق أن أُكمل عليه الإعداد (اختبار سابق مثلًا) يجب أن يُطالَب بإعداد جديد
// (وزنه/هدفه هو). العلم القديم في `qimmah:onboarding:v1` يبقى خاصًّا بوضع الضيف
// (بلا حساب) فقط، بينما تُخزَّن حسابات المستخدمين المكتملة في سجلّ مستقل.

export const ONBOARDING_KEY = 'qimmah:onboarding:v1'
/** سجلّ الحسابات التي أكملت الإعداد على هذا التطبيق (لكل حساب، لا لكل جهاز). */
export const ONBOARDING_ACCOUNTS_KEY = 'qimmah:onboarding:accounts:v1'

export interface OnboardingState {
  completed: boolean
  completedAt?: string
  lastStep?: number
  /** مسودة إجابات الإعداد — تُحفظ بعد كل خطوة لاستئناف الإعداد لاحقًا. */
  draft?: unknown
  /** صاحب المسودة/الحالة الحالية (معرّف الحساب) أو غير محدّد لوضع الضيف. */
  owner?: string
}

const DEFAULT: OnboardingState = { completed: false }

export function loadOnboarding(): OnboardingState {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    return {
      completed: !!parsed.completed,
      completedAt: parsed.completedAt,
      lastStep: parsed.lastStep,
      draft: parsed.draft,
      owner: typeof parsed.owner === 'string' ? parsed.owner : undefined,
    }
  } catch {
    return { ...DEFAULT }
  }
}

/** يحفظ مسودة الإجابات دون المساس بحالة الإكمال (مصدر الحقيقة المؤقت للإعداد). */
export function saveDraft(draft: unknown, userId?: string | null): void {
  const prev = loadOnboarding()
  saveOnboarding({ ...prev, draft, owner: userId ?? undefined })
}

/**
 * يقرأ مسودة الإجابات المحفوظة إن كانت تعود لنفس المالك الحالي.
 * حساب جديد لا يرث مسودة حساب آخر (أو مسودة ضيف) — يبدأ بإعداد نظيف بوزنه/هدفه.
 */
export function loadDraft<T>(userId?: string | null): T | undefined {
  const s = loadOnboarding()
  const wanted = userId ?? undefined
  if (s.owner !== wanted) return undefined
  return s.draft as T | undefined
}

// ===== إكمال الإعداد لكل حساب (سجلّ مستقل عن علم الجهاز/الضيف) =====

function loadAccountRegistry(): Record<string, { completedAt: string }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ONBOARDING_ACCOUNTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, { completedAt: string }>) : {}
  } catch {
    return {}
  }
}

function saveAccountRegistry(reg: Record<string, { completedAt: string }>): void {
  if (typeof window === 'undefined') return
  try {
    safeWriteJson(ONBOARDING_ACCOUNTS_KEY, reg)
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}

/** هل أكمل هذا الحساب (بمعرّفه) الإعداد على هذا الجهاز؟ */
export function isAccountOnboarded(userId: string): boolean {
  return Boolean(loadAccountRegistry()[userId])
}

/** يُعلّم حسابًا بأنه أكمل الإعداد (يُستخدم عند الإنهاء أو عند المزامنة من الملف السحابي). */
export function markAccountOnboarded(userId: string): void {
  if (!userId) return
  const reg = loadAccountRegistry()
  reg[userId] = { completedAt: new Date().toISOString() }
  saveAccountRegistry(reg)
}

/** يُلغي علامة إكمال حساب (لإعادة تشغيل الإعداد لذلك الحساب). */
export function clearAccountOnboarded(userId: string): void {
  if (!userId) return
  const reg = loadAccountRegistry()
  if (reg[userId]) {
    delete reg[userId]
    saveAccountRegistry(reg)
  }
}

/**
 * قرار البوابة الوحيد: هل اكتمل الإعداد للمالك الحالي؟
 * - مستخدم مسجّل (userId): لكل **حساب** — حساب جديد لا يُعدّ مكتملًا أبدًا ولو أُكمل
 *   الإعداد على الجهاز نفسه بحساب آخر من قبل.
 * - ضيف (null): علم الجهاز القديم (سلوك بلا تغيير).
 */
export function isOnboardingComplete(userId: string | null | undefined): boolean {
  if (userId) return isAccountOnboarded(userId)
  return loadOnboarding().completed
}

export function saveOnboarding(state: OnboardingState): void {
  safeWriteJson(ONBOARDING_KEY, state)
}

/** يحدّث آخر خطوة دون المساس بحالة الإكمال (يُستخدم أثناء التنقّل/الحفظ المؤقت). */
export function setLastStep(step: number): void {
  const prev = loadOnboarding()
  saveOnboarding({ ...prev, lastStep: step })
}

/**
 * يضع علامة الإكمال. مسجّل الدخول → يُسجَّل إكماله في سجلّ الحسابات فقط (لا يُلمَس
 * علم الجهاز حتى لا «يتسرّب» الإكمال لحساب جديد لاحق). الضيف → علم الجهاز كما كان.
 */
export function markCompleted(userId?: string | null, step?: number): void {
  const prev = loadOnboarding()
  if (userId) {
    markAccountOnboarded(userId)
    saveOnboarding({ ...prev, owner: userId, lastStep: step ?? prev.lastStep })
    return
  }
  saveOnboarding({
    ...prev,
    completed: true,
    completedAt: new Date().toISOString(),
    lastStep: step ?? prev.lastStep,
  })
}

/**
 * يعيد تشغيل الإعداد الأولي للمالك الحالي — يلغي الإكمال فقط دون مسح بيانات التخصيص.
 * مسجّل الدخول → يُلغى إكمال حسابه؛ الضيف → علم الجهاز.
 */
export function restartOnboarding(userId?: string | null): void {
  if (userId) clearAccountOnboarded(userId)
  saveOnboarding({ completed: false, lastStep: 0 })
}
