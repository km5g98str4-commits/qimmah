// عرض الكمية بوحدات منزلية مألوفة بجانب الجرامات — طبقة **عرض فقط**.
//
// المبدأ: الجرام يبقى مصدر الحقيقة الوحيد لحساب السعرات/الماكروز (لا نغيّر أي حسبة).
// نستخرج الوحدة المنزلية من تسمية الحصة الموجودة أصلًا في بيانات الطعام (servingLabelAr)
// إن وُجدت («كوب»، «حبة»، «ملعقة كبيرة»…)، وإلا نستخدم «حصة» العامة — لا نخترع وحدات
// ولا تحويلات منزلية غير موثوقة أبدًا.

import type { Lang } from './appPreferences'

interface ServingSource {
  servingLabelAr?: string
  servingGrams?: number
}

// الوحدات المنزلية المعروفة داخل تسميات الحصص — الأطول أولًا كي لا تبتلع «ملعقة»
// تسمية «ملعقة كبيرة»، وبمقابل إنجليزي لكل وحدة.
const NOUNS: { ar: string; en: string }[] = [
  { ar: 'ملعقة كبيرة', en: 'tbsp' },
  { ar: 'ملعقة صغيرة', en: 'tsp' },
  { ar: 'نصف كوب', en: 'half cup' },
  { ar: 'صحن صغير', en: 'small plate' },
  { ar: 'ملعقة', en: 'spoon' },
  { ar: 'كوب', en: 'cup' },
  { ar: 'صحن', en: 'plate' },
  { ar: 'بوكس', en: 'box' },
  { ar: 'ساندويتش', en: 'sandwich' },
  { ar: 'قطعة', en: 'piece' },
  { ar: 'حبة', en: 'piece' },
  { ar: 'شريحة', en: 'slice' },
  { ar: 'عبوة', en: 'pack' },
  { ar: 'علبة', en: 'can' },
  { ar: 'كيس', en: 'bag' },
  { ar: 'رغيف', en: 'loaf' },
  { ar: 'تمرة', en: 'date' },
  { ar: 'سكوب', en: 'scoop' },
  { ar: 'حفنة', en: 'handful' },
]

/** يستخرج الوحدة المنزلية من تسمية الحصة إن وُجدت، وإلا «حصة» العامة (بلا اختراع). */
export function servingNoun(servingLabelAr: string | undefined, lang: Lang): string {
  if (servingLabelAr) {
    for (const n of NOUNS) {
      if (servingLabelAr.includes(n.ar)) return lang === 'en' ? n.en : n.ar
    }
  }
  return lang === 'en' ? 'serving' : 'حصة'
}

/** ينسّق عدد الحصص لرقم مقروء (خانة عشرية واحدة، بلا أصفار زائدة). */
function fmtCount(n: number): string {
  const r = Math.round(n * 10) / 10
  return r % 1 === 0 ? r.toFixed(0) : String(r)
}

/**
 * سطر كمية إنساني: «100 جم · كوب» عند مطابقة الحصة المرجعية، أو «150 جم · 1.5 كوب».
 * العدّ = grams ÷ servingGrams الموجودة في البيانات — قسمة عرضية فقط، لا تحويل مخترَع.
 * بلا غرامات مرجعية صالحة → الجرامات وحدها (ونوثّق غياب بيانات الحصة كمتابعة).
 */
export function quantityLine(grams: number, item: ServingSource, lang: Lang, gramsUnit: string): string {
  const base = item.servingGrams && item.servingGrams > 0 ? item.servingGrams : 0
  if (!base) return `${grams} ${gramsUnit}`
  const noun = servingNoun(item.servingLabelAr, lang)
  const count = grams / base
  // ضمن ±٥٪ من حصة واحدة نعرض اسم الوحدة وحده («كوب») — أوضح من «1 كوب».
  const serving = Math.abs(count - 1) < 0.05 ? noun : `${fmtCount(count)} ${noun}`
  return `${grams} ${gramsUnit} · ${serving}`
}

/** ملخّص الحصة المرجعية للعنصر نفسه: «100 جم · كوب» — أو null بلا غرامات حصة. */
export function servingSummary(item: ServingSource, lang: Lang, gramsUnit: string): string | null {
  if (!item.servingGrams || item.servingGrams <= 0) return null
  return quantityLine(item.servingGrams, item, lang, gramsUnit)
}

/**
 * نص حصص لسجل محفوظ (لا مرجع للعنصر الأصلي — نستخدم عامل الحصص المخزَّن مع الإدخال):
 * «1.5 حصة» — أو null عند التطابق مع حصة واحدة/غياب البيانات (لا ضجيج).
 */
export function loggedServingsText(servings: number | undefined, lang: Lang): string | null {
  if (!servings || servings <= 0 || Math.abs(servings - 1) < 0.05) return null
  return `${fmtCount(servings)} ${lang === 'en' ? 'servings' : 'حصة'}`
}
