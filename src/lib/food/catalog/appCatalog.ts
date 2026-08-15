/**
 * الكتالوج على مستوى التطبيق — مثيل واحد كسول + محوّل عرض.
 *
 * ═══ لماذا محوّل لا نوع جديد في الواجهة ═══
 * الواجهة تعرض `FoodItem` منذ البدء. تمرير نوع ثانٍ إليها يعني تفريعًا في كل
 * موضع عرض واختيار وتسجيل — أي إعادة هيكلة للتغذية، وهي **ممنوعة** في هذه
 * الحزمة. فالمحوّل يجعل نتائج الكتالوج تسلك نفس المسار القائم بلا تعديل بنيوي.
 *
 * ═══ وسم المصدر ═══
 * المعرّف يبدأ بـ`off:` للسجلات المشتقّة من Open Food Facts. الوسم ليس تزيينًا:
 * نسب ODbL يجب أن يظهر **حين تظهر نتائج OFF**، وألّا يظهر على الأصناف المحلية
 * فيوحي زورًا بأن بيانات قِمّة المنسَّقة مأخوذة من مصدر خارجي.
 */
import { Catalog } from './catalog'
import type { CatalogProduct } from './types'
import type { FoodItem } from '@/data/foodItems'

/** بادئة معرّف السجلات المشتقّة من OFF — عليها يتوقّف إظهار النسب. */
export const OFF_ID_PREFIX = 'off:'

export const isOffDerived = (id: string): boolean => id.startsWith(OFF_ID_PREFIX)

let instance: Catalog | null = null
let initializing: Promise<Catalog | null> | null = null

/** جلب نصّي حقيقي — يعيد `null` بدل الرمي، فانقطاع الشبكة لا يكسر البحث. */
async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/**
 * يهيّئ الكتالوج مرّة واحدة. الفشل **ليس حرجًا**: الواجهة تبقى على الأصناف
 * المحلية، وهو تدهور صادق لا شاشة خطأ.
 */
export async function getAppCatalog(): Promise<Catalog | null> {
  if (instance) return instance
  if (initializing) return initializing
  initializing = (async () => {
    try {
      const cat = await Catalog.create({ fetchText })
      await cat.init()
      instance = cat
      return cat
    } catch {
      return null
    } finally {
      initializing = null
    }
  })()
  return initializing
}

/** للاختبار فقط: يعيد الحالة إلى الصفر. */
export function __resetAppCatalog(): void {
  instance = null
  initializing = null
}

const pick = (ar: string | null, en: string | null, fallback: string): string => ar || en || fallback

/**
 * يحوّل سجل كتالوج إلى `FoodItem`.
 *
 * الأساس `per_100g` في خطّ الإنتاج. إن أعلن السجل حصّة حقيقية تُحسب القيم عليها
 * ويُسمّى وزنها؛ وإلا يبقى العرض على ١٠٠غ **معلنًا** — لا تُخترع حصّة لا يعرفها
 * المصدر (§5: ما لا نعرفه لا يُعرض رقمًا مصنوعًا).
 */
export function catalogProductToFoodItem(p: CatalogProduct, lang: 'ar' | 'en'): FoodItem {
  const grams = typeof p.serving_size === 'number' && p.serving_size > 0 ? p.serving_size : 100
  const factor = grams / 100
  const per = (v: number | null): number => (typeof v === 'number' ? Math.round(v * factor) : 0)
  const brand = pick(p.brand_ar, p.brand_en, '')
  const name = pick(p.name_ar, p.name_en, p.gtin)
  return {
    id: `${OFF_ID_PREFIX}${p.gtin}`,
    nameAr: `${p.name_ar || p.name_en || p.gtin}${brand ? ` — ${brand}` : ''}`,
    nameEn: `${p.name_en || p.name_ar || p.gtin}${brand ? ` — ${brand}` : ''}`,
    // تصنيف قائم أصلًا لمنتجات الباركود — لا مفردة جديدة في القاموس.
    category: 'منتج ممسوح بالباركود',
    servingLabelAr: lang === 'ar' ? `${grams} غ` : `${grams} g`,
    servingGrams: grams,
    calories: per(p.energy_kcal),
    protein: per(p.protein_g),
    carbs: per(p.carbs_g),
    fat: per(p.fat_g),
    keywords: [name, brand].filter(Boolean),
  }
}
