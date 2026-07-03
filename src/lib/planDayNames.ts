// تطبيع أسماء أيام الخطة وقت القراءة (P10.1) — طبقة هجرة غير تدميرية.
//
// خطط المستخدمين المحفوظة قبل دعم nameEn قد تأتي بأيام بلا اسم إنجليزي، أو بأسماء
// عربية قديمة فقط («دفع»، «اليوم أ»، «اليوم 1 · جسم كامل»...). هنا نشتق nameEn من
// nameAr عبر خريطة التقسيمات القديمة، ونزيل لواحق التمييز القديمة («أ/ب/ج») عبر
// أدوات workoutDayLabel نفسها. الاسم غير المعروف يبقى كما هو (nameEn = nameAr)
// فلا ينكسر العرض أبدًا. لا كتابة في التخزين — تطبيع عند كل قراءة فقط.

import type { PlanDay, WorkoutPlan } from '@/types/workout'
import { splitBaseAr } from './workoutDayLabel'

/** يحوّل الأرقام الهندية إلى لاتينية («١» → «1»). */
function westernDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

/** حروف التمييز القديمة «اليوم أ/ب/ج…» ومقابلها اللاتيني. */
const AR_LETTER_EN: Record<string, string> = {
  'أ': 'A',
  'ب': 'B',
  'ج': 'C',
  'د': 'D',
  'هـ': 'E',
  'ه': 'E',
  'و': 'F',
  'ز': 'G',
}

// خريطة أسماء التقسيمات القديمة → الإنجليزية. الترتيب مهم: الأسماء المركّبة أولًا
// كي لا يبتلع «أكتاف» اسم «ذراعين وأكتاف» مثلًا.
const LEGACY_SPLIT_EN: Array<[RegExp, string]> = [
  [/^جسم\s*كامل$/, 'Full Body'],
  [/^ذراعين?\s*وأكتاف$/, 'Arms & Shoulders'],
  [/^بطن\s*وكور$/, 'Core'],
  [/^أكتاف$|^اكتاف$|^كتف$/, 'Shoulders'],
  [/^ترايسبس$/, 'Triceps'],
  [/^بايسبس$/, 'Biceps'],
  [/^دفع$/, 'Push'],
  [/^سحب$/, 'Pull'],
  [/^أرجل$|^ارجل$|^رجل$/, 'Legs'],
  [/^علوي$/, 'Upper'],
  [/^سفلي$/, 'Lower'],
  [/^صدر$/, 'Chest'],
  [/^ظهر$/, 'Back'],
  [/^ذراعين?$|^أذرع$|^اذرع$|^ذراع$/, 'Arms'],
  [/^بطن$/, 'Abs'],
  [/^كور$/, 'Core'],
  [/^كارديو$/, 'Cardio'],
  [/^تمرين$/, 'Workout'],
]

/**
 * يترجم اسم تقسيمة عربيًا قديمًا إلى الإنجليزية، ويدعم:
 * الأسماء المركّبة («صدر + ترايسبس»)، لاحقة التركيز «(مركّز)»، والترقيم («علوي ١»).
 * يرجع undefined للاسم غير المعروف (فيُبقيه المستدعي عربيًا كحلّ أخير).
 */
function translateBase(baseAr: string): string | undefined {
  const s = baseAr.trim()
  if (!s) return undefined

  // اسم مركّب بعلامة «+» — نترجم كل جزء على حدة.
  if (s.includes('+')) {
    const parts = s.split('+').map((p) => translateBase(p))
    return parts.every(Boolean) ? parts.join(' + ') : undefined
  }

  // لاحقة التركيز: «أرجل (مركّز)» → «Legs (Focus)».
  const focus = /^(.+?)\s*\(\s*(?:مركّز|مركز)\s*\)$/.exec(s)
  if (focus) {
    const inner = translateBase(focus[1])
    return inner ? `${inner} (Focus)` : undefined
  }

  // ترقيم في نهاية الاسم: «علوي ١» → «Upper 1».
  const numbered = /^(.+?)\s+([٠-٩0-9]+)$/.exec(s)
  if (numbered) {
    const inner = translateBase(numbered[1])
    return inner ? `${inner} ${westernDigits(numbered[2])}` : undefined
  }

  for (const [re, en] of LEGACY_SPLIT_EN) if (re.test(s)) return en
  return undefined
}

/**
 * يشتق الاسم الإنجليزي ليوم من اسمه العربي المحفوظ.
 * يرجع undefined إن تعذّرت الترجمة (اسم مخصّص غير معروف).
 */
export function deriveDayNameEn(nameAr: string): string | undefined {
  const s = (nameAr ?? '').trim()
  if (!s) return undefined

  // صيغة المولّد: «اليوم N · تقسيمة» → «Day N · Split».
  const dayNum = /^اليوم\s+([٠-٩0-9]+)\s*·\s*(.+)$/.exec(s)
  if (dayNum) {
    const rawBase = dayNum[2].trim()
    const base = translateBase(rawBase) ?? translateBase(splitBaseAr(rawBase))
    return base ? `Day ${westernDigits(dayNum[1])} · ${base}` : undefined
  }

  // قوالب إرث: «اليوم أ» → «Day A»، «اليوم ٢» → «Day 2».
  const legacyLetter = /^اليوم\s+(هـ|[أبجدوزه])$/.exec(s)
  if (legacyLetter) {
    const letter = AR_LETTER_EN[legacyLetter[1]]
    if (letter) return `Day ${letter}`
  }
  const legacyNum = /^اليوم\s+([٠-٩0-9]+)$/.exec(s)
  if (legacyNum) return `Day ${westernDigits(legacyNum[1])}`

  // اسم تقسيمة مباشر («دفع»، «صدر + ترايسبس»)، وإلا نحاول بعد إزالة لواحق التمييز القديمة.
  return translateBase(s) ?? translateBase(splitBaseAr(s))
}

/** يطبّع يومًا واحدًا: يكمل الاسم الناقص من الآخر — لا يمسّ الأيام السليمة. */
function normalizeDay(day: PlanDay): PlanDay {
  const ar = (day.nameAr ?? '').trim()
  const en = (day.nameEn ?? '').trim()
  if (ar && en) return day
  if (!ar && en) return { ...day, nameAr: en } // خطة نادرة بلا عربي — الإنجليزي احتياط
  const derived = deriveDayNameEn(ar)
  // غير معروف → نُبقي العربي في الحقلين حتى لا يظهر يوم بلا اسم في الوضع الإنجليزي.
  return { ...day, nameAr: ar, nameEn: derived ?? ar }
}

/**
 * يطبّع أسماء أيام خطة كاملة وقت القراءة. يرجع نفس المرجع إن لم يتغيّر شيء
 * (بلا إعادة رندر أو حفظ غير ضروري). لا يغيّر معرّفات الأيام إطلاقًا،
 * فسجلّ الجلسات (workoutDayId/workoutDayName) يبقى سليمًا.
 */
export function normalizePlanDayNames(plan: WorkoutPlan): WorkoutPlan {
  if (!plan || !Array.isArray(plan.days) || !plan.days.length) return plan
  let changed = false
  const days = plan.days.map((d) => {
    const nd = normalizeDay(d)
    if (nd !== d) changed = true
    return nd
  })
  return changed ? { ...plan, days } : plan
}
