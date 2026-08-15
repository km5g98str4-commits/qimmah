// تسمية موحّدة ليوم التمرين: «اليوم N · <التقسيمة>» (مثال: «اليوم 1 · دفع»، «اليوم 2 · جسم كامل»).
// تزيل أي لاحقة تمييز قديمة (حرف عربي مفرد «أ/ب/ج…» أو رقم) من اسم التقسيمة،
// فلا يظهر للمستخدم أبدًا تصنيف «أ/ب/ج» المجرّد.

// لاحقة تمييز عربية في نهاية الاسم: حرف مفرد (أ ب ج د هـ و ز) أو رقم (هندي/لاتيني) بعد مسافة.
const AR_DISAMBIG = /\s+(?:هـ|[أبجدوزه]|[٠-٩0-9]+)$/
// لاحقة تمييز إنجليزية: حرف A–G مفرد أو رقم بعد مسافة.
const EN_DISAMBIG = /\s+(?:[A-Ga-g]|\d+)$/

/** يستخرج اسم التقسيمة الأساسي بالعربية بإزالة بادئة «اليوم » ولاحقة التمييز. */
export function splitBaseAr(nameAr: string): string {
  let s = (nameAr ?? '').trim()
  s = s.replace(/^اليوم\s+/, '') // قوالب إرث: «اليوم أ»
  while (AR_DISAMBIG.test(s)) s = s.replace(AR_DISAMBIG, '').trim()
  return s || 'تمرين'
}

/** يستخرج اسم التقسيمة الأساسي بالإنجليزية. */
export function splitBaseEn(nameEn: string): string {
  let s = (nameEn ?? '').trim()
  s = s.replace(/^Day\s+/i, '')
  while (EN_DISAMBIG.test(s)) s = s.replace(EN_DISAMBIG, '').trim()
  return s || 'Workout'
}

/**
 * تسمية اليوم النهائية بالعربية حسب موضعه في الخطة (index صفري).
 *
 * ── [FINAL-CONVERGENCE] الرقم هنا يبقى **لاتينيًّا عمدًا** (PKG-7) ──────────
 * هذا النصّ **يُخزَّن** داخل الخطة (`planGenerator.ts:757` → `customization`)،
 * فهو مُدخَل لا مخرَج. وتحويله عند التوليد يبدو إصلاحًا وهو ضرران:
 *   ١. يخلط المخزون — خطط قديمة «اليوم 1» وجديدة «اليوم ١» في نفس الجهاز.
 *   ٢. **ويُفرِغ حارسه**: `run-numeral-policy-proof` يشترط مُدخَلًا لاتينيًّا
 *      («لولا أن الخطة المولَّدة تحمل أرقامًا مخزَّنة لاتينية لكان الإثبات فارغًا»).
 *      فبتحويل المصدر تمرّ تأكيدات «بلا رقم لاتيني» **حتى لو نُزع حدّ العرض**.
 * التحويل عند حدّ العرض حصرًا عبر `formatNumeralsIn` — فيصلح المخزون القديم أيضًا.
 */
export function workoutDayNameAr(splitNameAr: string, index: number): string {
  return `اليوم ${index + 1} · ${splitBaseAr(splitNameAr)}`
}

/** تسمية اليوم النهائية بالإنجليزية حسب موضعه في الخطة (index صفري). */
export function workoutDayNameEn(splitNameEn: string, index: number): string {
  return `Day ${index + 1} · ${splitBaseEn(splitNameEn)}`
}
