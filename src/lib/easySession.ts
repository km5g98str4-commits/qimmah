// بروتوكول التعثّر — النسخة المخفّفة ليوم واحد (ADV-18) — [CTO-70] البند ٣.
//
// **يعدّل جلسة اليوم فقط، لا الخطة.** العلم مختوم باليوم ومربوط بالمالك، فينتهي
// مفعوله تلقائيًا بانتهاء اليوم بلا أي كتابة في الخطة المحفوظة. أي تعديل خطة
// حقيقي يبقى ملك مسار الاقتراح-بسبب القائم (§8 قرار مقفل ٣: اقتراح لا تعديل صامت).

import { readJson, writeJson, removeKey } from '@/lib/safeStorage'
import { getLastUser } from '@/lib/accountScope'
import { getDayStamp } from '@/lib/today'

export const EASY_SESSION_KEY_BASE = 'qimmah:easySession:v1'

interface EasySessionState {
  /** ختم اليوم الذي فُعّل فيه التخفيف — غير اليوم الحالي = منتهٍ. */
  date: string
}

export function easySessionKey(uid?: string | null): string {
  const owner = uid === undefined ? (getLastUser() ?? null) ?? 'guest' : uid ?? 'guest'
  return `${EASY_SESSION_KEY_BASE}:${owner}`
}

/** يفعّل التخفيف لليوم الحالي وحده. */
export function enableEasyToday(uid?: string | null, now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  writeJson(easySessionKey(uid), { date: getDayStamp(now) } satisfies EasySessionState)
}

export function clearEasyToday(uid?: string | null): void {
  if (typeof window === 'undefined') return
  removeKey(easySessionKey(uid))
}

/** هل التخفيف مفعَّل **لهذا اليوم**؟ ختم يوم قديم يُعامَل منتهيًا. */
export function isEasyToday(uid?: string | null, now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false
  const raw = readJson<unknown>(easySessionKey(uid), null)
  if (!raw || typeof raw !== 'object') return false
  return (raw as Partial<EasySessionState>).date === getDayStamp(now)
}

/**
 * مدّة النسخة المخفّفة بالدقائق — مشتقّة من **المدّة المعروضة نفسها** (ثلثها)
 * ومحصورة بين ٥ و١٥. فلا يظهر رقمان متناقضان للمستخدم، ولا يُخترع رقم ثابت.
 * مثال المجلس: ٢٥ ⇒ ٨.
 */
export function easyMinutesFor(fullMin: number): number {
  if (!Number.isFinite(fullMin) || fullMin <= 0) return 0
  return Math.min(15, Math.max(5, Math.round(fullMin / 3)))
}

/**
 * عدد التمارين في النسخة المخفّفة — نفس نسبة المدّة مطبَّقة على عدد التمارين،
 * وواحد على الأقل. الترتيب محفوظ: يأخذ **أوائل** تمارين اليوم لا عيّنة عشوائية،
 * فما يُنجزه المستخدم هو بداية جلسته الحقيقية لا جلسة أخرى.
 */
/**
 * سقف دقائق الأسبوع الأول ([CTO-70] البند ٤ · ADV-21): **≤ ١٥ دقيقة** لكل جلسة
 * في الأيام السبعة الأولى.
 *
 * ⚠️ **صورته الصامتة مرفوعة بأمر المؤسس — [FOUNDER-QA-001].** كان يُطبَّق على
 * كل حساب جديد بلا اختيار منه، فيقتطع تمارين اليوم بنسبة
 * `السقف ÷ المدّة المُعلَنة`؛ وكلّما طالت الجلسة المختارة اشتدّ الاقتطاع حتى
 * ينهار عند ٧٥–٩٠ دقيقة إلى **تمرين واحد** («١ من ١»).
 * [WORKOUT-CONTINUITY-001] جعله **مُبلَّغًا** وأبقاه؛ ونصّ المؤسس بعده صريح:
 * «يوم علوي يجب أن يحتوي الجلسة كاملة». فبقي الثابتان مصدرًا لسطر «أسبوعك
 * الأول» ولحساب المخفّفة، ولم يبق لهما مسار اقتطاع تلقائي.
 *
 * **لطف الأسبوع الأوّل يبقى عرضًا**: «ابدأ بنسخة أخفّ» بالرقمين صريحين.
 */
export const FIRST_WEEK_MAX_MIN = 15
export const FIRST_WEEK_DAYS = 7

/**
 * أرضية النسخة المخفّفة — [FOUNDER-QA-001].
 *
 * «أخفّ» تعني جلسة أقصر، **لا تمرينًا واحدًا**. بلا أرضية كانت النسبة وحدها
 * تحكم، فمن اختار ٩٠ دقيقة ثم ضغط «أخفّ» يهبط إلى تمرين واحد — نفس العطل
 * بمدخل آخر. والأرضية تسري **إلى حدّ اليوم نفسه**: يوم من تمرينين يبقى
 * تمرينين، فلا نضيف ما ليس في الخطة.
 */
export const EASY_MIN_EXERCISES = 3

/**
 * صباح الخميس ([CTO-70] البند ٤) — نافذة السطر الاستباقي.
 * الخميس = ٤ في `Date.getDay()`، و«صباحًا» حتى الظهر: السطر استباق لا تعقيب،
 * فعرضه مساءً بعد أن يفوت اليوم يقلبه لومًا — وهو ممنوع (§6).
 */
export function isThursdayMorning(now: Date = new Date()): boolean {
  return now.getDay() === 4 && now.getHours() < 12
}

/** هل نحن داخل الأيام السبعة الأولى؟ `null` (لا رحلة بعد) يُعامَل «نعم» — أول يوم. */
export function isFirstWeek(dayIndex: number | null): boolean {
  return dayIndex === null || dayIndex <= FIRST_WEEK_DAYS
}

/**
 * المدّة المستهدفة للجلسة بعد تطبيق سقف الأسبوع الأول.
 * تُرجع المدّة كما هي خارج الأسبوع الأول، والأصغر منها ومن ١٥ داخله — فلا نطيل
 * جلسة قصيرة أصلًا باسم «السقف».
 */
export function cappedSessionMinutes(fullMin: number, dayIndex: number | null): number {
  if (!Number.isFinite(fullMin) || fullMin <= 0) return 0
  return isFirstWeek(dayIndex) ? Math.min(fullMin, FIRST_WEEK_MAX_MIN) : fullMin
}

export function easyExerciseCount(total: number, fullMin: number, targetMin?: number): number {
  if (total <= 0) return 0
  const target = targetMin ?? easyMinutesFor(fullMin)
  if (target <= 0 || fullMin <= 0) return total
  const byRatio = Math.round((total * target) / fullMin)
  // الأرضية أوّلًا ثم سقف اليوم: لا تحت `EASY_MIN_EXERCISES`، ولا فوق ما في الخطة.
  return Math.min(total, Math.max(EASY_MIN_EXERCISES, byRatio))
}

/**
 * **سلطة واحدة لعدد تمارين الجلسة** — [FOUNDER-QA-001].
 *
 * الثابت الحاكم: **جلسة اليوم هي يوم الخطة كاملًا.** لا يقتطعها إلا اختيار
 * صريح من المستخدم (زرّ «ابدأ بنسخة أخفّ»)، ولا ينزل الاقتطاع تحت الأرضية.
 * كل مسار يبني جلسة يمرّ من هنا، فلا يعود بالإمكان أن يخترع مسارٌ ثانٍ
 * اقتطاعًا صامتًا كما فعل سقف الأسبوع الأول.
 *
 * @param total عدد تمارين يوم الخطة.
 * @param fullMin المدّة المُعلَنة في ملف المستخدم (ميزانيته لا تقدير جلسته).
 * @param easyRequested هل فعّل المستخدم النسخة المخفّفة **لهذا اليوم** بنفسه؟
 */
export function sessionExerciseCount(total: number, fullMin: number, easyRequested: boolean): number {
  if (total <= 0) return 0
  if (!easyRequested || fullMin <= 0) return total
  const target = easyMinutesFor(fullMin)
  if (target <= 0 || target >= fullMin) return total
  return easyExerciseCount(total, fullMin, target)
}
