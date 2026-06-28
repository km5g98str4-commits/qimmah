// بحث الأطعمة v2 — تطبيع عربي/إنجليزي + مرادفات (aliases) للهجة الخليجية.
//
// يعمل فوق foodDatabase (قاعدة v2). يوفّر أيضًا searchAllFoods الذي يدمج
// قاعدة v2 المنسوخة مع foodItems القديمة (عبر الجسر foodV2ToLegacy) ليستخدمه
// QuickMealLogger مع الحفاظ على التوافق الكامل. تفاصيل: docs/v2-research/FOOD_DATABASE_STRATEGY.md

import type { FoodV2 } from '@/types/nutrition'
import { foodDatabase, foodV2ToLegacy } from '@/data/foodDatabase'
import { searchFood as searchLegacyFoods, type FoodItem } from '@/data/foodItems'

/**
 * تطبيع نص للبحث:
 * - إزالة التشكيل والتطويل.
 * - توحيد الألف (أ/إ/آ → ا) والياء (ى → ي) والتاء المربوطة (ة → ه) والهمزات.
 * - حذف الفراغات الزائدة + توحيد حالة الأحرف اللاتينية.
 */
export function normalizeFoodQuery(input: string): string {
  return (input || '')
    .toString()
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, '') // تشكيل
    .replace(/ـ/g, '') // تطويل ـ
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * مجموعات مرادفات — كل مجموعة كلمات تعني نفس الشيء (عربي/إنجليزي/نقحرة).
 * تُستخدم لتوسيع الاستعلام: البحث عن «rice» يطابق «رز»، و«بروست» يطابق «broasted».
 */
export const FOOD_ALIASES: string[][] = [
  ['كبسه', 'كبسة', 'kabsa', 'kabsah'],
  ['رز', 'ارز', 'أرز', 'rice', 'riz'],
  ['دجاج', 'فراخ', 'chicken', 'dajaj'],
  ['لحم', 'لحمه', 'meat', 'beef', 'lamb'],
  ['شاورما', 'shawarma', 'shwarma'],
  ['بروست', 'بروستد', 'broast', 'broasted'],
  ['بخاري', 'bukhari', 'bukhary'],
  ['مندي', 'mandi', 'mandy'],
  ['مظبي', 'مضبي', 'madhbi', 'mathbi'],
  ['مدفون', 'madfoon', 'madfun'],
  ['برياني', 'biryani', 'biriyani'],
  ['كنافه', 'كنافة', 'kunafa', 'knafeh', 'kanafah'],
  ['تمر', 'رطب', 'dates', 'tamr'],
  ['كرك', 'karak', 'kark'],
  ['قهوه', 'قهوة', 'coffee', 'gahwa'],
  ['حليب', 'milk', 'laban'],
  ['بيض', 'بيضه', 'بيضة', 'egg', 'eggs'],
  ['سمك', 'fish', 'samak'],
  ['تونه', 'تونة', 'tuna'],
  ['برجر', 'برغر', 'همبرجر', 'burger', 'hamburger'],
  ['عصير', 'juice'],
  ['ماء', 'ماي', 'مويه', 'water'],
]

const NORMALIZED_ALIASES: string[][] = FOOD_ALIASES.map((group) =>
  group.map((term) => normalizeFoodQuery(term)),
)

/** يوسّع الاستعلام بكل المرادفات في أي مجموعة يطابقها. */
function expandTerms(q: string): string[] {
  const terms = new Set<string>([q])
  for (const group of NORMALIZED_ALIASES) {
    if (group.some((term) => term === q || (q.length >= 2 && (term.includes(q) || q.includes(term))))) {
      group.forEach((term) => terms.add(term))
    }
  }
  return [...terms].filter(Boolean)
}

/** كل النصوص القابلة للبحث في صنف (مطبَّعة). */
function haystack(f: FoodV2): string[] {
  return [
    f.name_ar,
    f.name_en,
    f.brand_ar ?? '',
    f.brand_en ?? '',
    ...(f.aliases_ar ?? []),
    ...(f.aliases_en ?? []),
  ]
    .filter(Boolean)
    .map(normalizeFoodQuery)
}

const CONFIDENCE_RANK: Record<FoodV2['confidence'], number> = { high: 0, medium: 1, low: 2 }

/**
 * بحث في قاعدة v2 مع تطبيع ومرادفات.
 * الترتيب: تطابق البداية أولًا، ثم الاحتواء، ثم حسب الثقة.
 * استعلام فارغ → كامل القاعدة (محصورًا بالحد إن مُرّر).
 */
export function searchFoods(query: string, limit?: number, db: FoodV2[] = foodDatabase): FoodV2[] {
  const q = normalizeFoodQuery(query)
  if (!q) return typeof limit === 'number' ? db.slice(0, limit) : db

  const terms = expandTerms(q)

  type Scored = { food: FoodV2; score: number }
  const scored: Scored[] = []

  for (const food of db) {
    const fields = haystack(food)
    let best = Infinity
    for (const field of fields) {
      for (const term of terms) {
        if (!term) continue
        if (field === term) best = Math.min(best, 0)
        else if (field.startsWith(term)) best = Math.min(best, 1)
        else if (field.includes(term)) best = Math.min(best, 2)
      }
    }
    if (best !== Infinity) scored.push({ food, score: best })
  }

  scored.sort((a, b) => a.score - b.score || CONFIDENCE_RANK[a.food.confidence] - CONFIDENCE_RANK[b.food.confidence])
  const result = scored.map((s) => s.food)
  return typeof limit === 'number' ? result.slice(0, limit) : result
}

/**
 * بحث موحّد للواجهة: يدمج قاعدة v2 المنسوخة (مع التطبيع والمرادفات) مع foodItems
 * القديمة، ويُرجع كلها بشكل FoodItem القديم (عبر الجسر) ليبقى QuickMealLogger متوافقًا.
 *
 * الترتيب: نتائج v2 المنسوخة أولًا (وسوم حصص ثنائية اللغة + تركيز سعودي/خليجي)،
 * ثم أصناف foodItems القديمة غير المكرّرة. إزالة التكرار بالاسم العربي المطبّع.
 * استعلام فارغ → [] (الواجهة لا تعرض نتائج إلا بوجود نص بحث).
 */
export function searchAllFoods(query: string, limit = 12): FoodItem[] {
  if (!normalizeFoodQuery(query)) return []
  const v2 = searchFoods(query).map(foodV2ToLegacy)
  const legacy = searchLegacyFoods(query)
  const seen = new Set<string>()
  const merged: FoodItem[] = []
  for (const f of [...v2, ...legacy]) {
    const key = normalizeFoodQuery(f.nameAr) || normalizeFoodQuery(f.nameEn) || f.id
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(f)
  }
  return merged.slice(0, limit)
}
