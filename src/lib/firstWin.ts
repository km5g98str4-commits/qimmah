// أول انتصار (ADV-13) — [CTO-70] البند ١.
//
// المبدأ: بعد إكمال الإعداد ودخول اللوحة أول مرّة، **إجراء واحد** مقترح يُنجَز في
// أقل من دقيقتين. لا جولة تعريفية، ولا شلل اختيار: واحد مقترح والباقي حاضر بلا إلحاح.
//
// الاختيار آليّ حسب وقت اليوم، لأن اقتراح «إحماء» الساعة ١١ ليلًا اقتراحٌ يُرفض
// فيبدأ المستخدم رحلته بفشل. بعد ٢١:٠٠ يُقترح الأخفّ مع سطر صادق يقول إن اليوم
// انتهى تقريبًا — الصدق قبل الطمأنينة (§6).

import { readJson, writeJson, removeKey } from '@/lib/safeStorage'
import { getLastUser } from '@/lib/accountScope'
import { trackLocal, type FirstWinKind } from '@/lib/tracking'

/** أساس المفتاح — موسوم بالمالك مثل بقية بيانات المستخدم. */
export const FIRST_WIN_KEY_BASE = 'qimmah:firstWin:v1'

/** الساعة التي يبدأ عندها «المساء» — بعدها يُقترح الأخفّ. */
export const EVENING_HOUR = 21

export type FirstWinPartOfDay = 'day' | 'evening'

export interface FirstWinState {
  /** أُنجز الانتصار الأول (فلا يُعرض ثانية أبدًا). */
  completed: boolean
  /** نوع ما أُنجز — للعرض «تم» وللتحليل. */
  kind?: FirstWinKind
  /** ختم الإنجاز (ISO) — لا يُعرض للمستخدم، للتشخيص فقط. */
  at?: string
}

const EMPTY: FirstWinState = { completed: false }

function ownerToken(uid: string | null | undefined): string {
  return uid ?? 'guest'
}

export function firstWinKey(uid?: string | null): string {
  const owner = uid === undefined ? ownerToken(getLastUser() ?? null) : ownerToken(uid)
  return `${FIRST_WIN_KEY_BASE}:${owner}`
}

export function loadFirstWin(uid?: string | null): FirstWinState {
  if (typeof window === 'undefined') return EMPTY
  const raw = readJson<unknown>(firstWinKey(uid), EMPTY)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY
  const s = raw as Partial<FirstWinState>
  return { completed: s.completed === true, kind: s.kind, at: typeof s.at === 'string' ? s.at : undefined }
}

/**
 * يعلّم الانتصار الأول منجزًا **عند وقوع الفعل الحقيقي** ويطلق حدثه مرّة واحدة.
 *
 * يُستدعى من نقاط الإنجاز الفعلية (تسجيل ماء · تسجيل وجبة · بدء تمرين) لا من
 * ضغطة البطاقة: الضغطة نيّة، والإنجاز هو ما وقع. ولو أنجز المستخدم الفعل من
 * مكان آخر تمامًا (تبويب التغذية مباشرةً) فهو انتصار أيضًا ويُحتسب.
 *
 * `meal` تصير `dinner` مساءً — نفس الفعل، والاسم يصف وقته الحقيقي.
 */
export function completeFirstWin(kind: FirstWinKind, now: Date = new Date()): void {
  try {
    if (typeof window === 'undefined') return
    if (loadFirstWin().completed) return
    const partOfDay = partOfDayFor(now)
    const resolved: FirstWinKind = kind === 'meal' && partOfDay === 'evening' ? 'dinner' : kind
    if (!markFirstWinCompleted(resolved, undefined, now)) return
    trackLocal('first_win_completed', { kind: resolved, partOfDay })
  } catch {
    /* الانتصار الأول تحسين تجربة — فشله لا يقاطع تسجيل وجبة أو بدء تمرين. */
  }
}

/** يعلّم الانتصار الأول منجزًا. يعيد `false` إن كان منجزًا أصلًا (فلا يُطلق حدث مكرّر). */
export function markFirstWinCompleted(kind: FirstWinKind, uid?: string | null, now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false
  if (loadFirstWin(uid).completed) return false
  writeJson(firstWinKey(uid), { completed: true, kind, at: now.toISOString() } satisfies FirstWinState)
  return true
}

/** يمسح حالة الانتصار الأول (إعادة ضبط/اختبار). */
export function clearFirstWin(uid?: string | null): void {
  if (typeof window === 'undefined') return
  removeKey(firstWinKey(uid))
}

/** قسم اليوم: بعد `EVENING_HOUR` مساء، وما دونه نهار. */
export function partOfDayFor(now: Date = new Date()): FirstWinPartOfDay {
  return now.getHours() >= EVENING_HOUR ? 'evening' : 'day'
}

export interface FirstWinSuggestion {
  kind: FirstWinKind
  partOfDay: FirstWinPartOfDay
  /** البدائل المعروضة بلا إلحاح — المقترح ليس سجنًا. */
  alternatives: FirstWinKind[]
}

/**
 * يختار الاقتراح حسب وقت اليوم:
 *   • نهار (قبل ٢١:٠٠) ⇒ **إحماء قصير** والبديل تسجيل وجبة.
 *   • مساء (٢١:٠٠ فما بعد) ⇒ **الأخفّ**: ماء، والبديل تسجيل العشاء.
 *
 * ثابت بلا عشوائية: نفس الوقت يعطي نفس الاقتراح دائمًا، فلا يتبدّل الاقتراح
 * تحت يد المستخدم بين إعادتَي رسم.
 */
export function suggestFirstWin(now: Date = new Date()): FirstWinSuggestion {
  const partOfDay = partOfDayFor(now)
  return partOfDay === 'evening'
    ? { kind: 'water', partOfDay, alternatives: ['dinner'] }
    : { kind: 'warmup', partOfDay, alternatives: ['meal'] }
}
