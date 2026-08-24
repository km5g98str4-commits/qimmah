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
import { retailGtin } from '../gtin'
import { foodSearchStrings } from '@/i18n/dict/foodSearch'

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
 * جذر أصول الكتالوج — `/food` من نفس الأصل افتراضيًا.
 *
 * ═══ لماذا قابلًا للضبط ═══
 * الشرائح الأربعون (٨١٫٤ ميغابايت خامًا) قد تُستضاف خارج Pages — دلو R2 بنطاق
 * مخصّص مثلًا. حين يحدث ذلك يصير الفرق **قيمة بيئة لا تعديل كود**:
 *   `VITE_FOOD_CDN_BASE=https://static.example.com/food`
 *
 * ⚠️ **شرطان لا يُنسيان** عند تغييرها (كلاهما خارج ملفات هذه الحارة):
 *   ١. `connect-src` في `public/_headers` يجب أن يسمح بالأصل الجديد، وإلا حجبت
 *      سياسة المحتوى كل طلب بصمت.
 *   ٢. الدلو يحتاج CORS يسمح بأصل التطبيق.
 * التفصيل في `docs/execution/qimmah-sovereign-closure/FOOD-LONGTAIL-PLAN.md`.
 *
 * القيمة عامّة بطبيعتها (رابط أصول ساكنة)، فوجودها في `VITE_*` سليم — لا سرّ فيها.
 */
const CDN_BASE = (import.meta.env?.VITE_FOOD_CDN_BASE as string | undefined)?.trim()

/**
 * يهيّئ الكتالوج مرّة واحدة. الفشل **ليس حرجًا**: الواجهة تبقى على الأصناف
 * المحلية، وهو تدهور صادق لا شاشة خطأ.
 */
export async function getAppCatalog(): Promise<Catalog | null> {
  if (instance) return instance
  if (initializing) return initializing
  initializing = (async () => {
    try {
      const cat = await Catalog.create(CDN_BASE ? { fetchText, baseUrl: CDN_BASE } : { fetchText })
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
 * اسم معروض لسجل معبّأ — **ولا معرّف داخلي في موضع الاسم** (البند ٣).
 *
 * ═══ ما كان يحدث ═══
 * كان السطر `p.name_ar || p.name_en || p.gtin`. والحقل `gtin` عندنا **GTIN-14
 * بأصفار بادئة** — مفتاح فهرسة داخلي لا الرقم المطبوع على العبوة. فسجلٌ بلا اسم
 * (والمخطّط يعترف بإمكانه: `no_arabic_name` · `no_english_name`) كان يظهر في
 * قائمة النتائج باسمٍ هو `00000017919678`، ويقرؤه المستخدم باركودًا — وليس هو.
 *
 * ═══ ما يحدث الآن ═══
 * اسم صريح من القاموس، والباركود بجانبه **بشكله التجاري وموسومًا بأنه باركود**.
 * فلا يبقى رقم يتظاهر بأنه اسم، ولا مفتاح داخلي يتظاهر بأنه GTIN.
 * ويبقى مميِّزًا لكل سجل، فلا ينهار إسقاط التكرار على «منتج بلا اسم» واحد.
 */
function displayName(p: CatalogProduct, key: 'name_ar' | 'name_en', lang: 'ar' | 'en'): string {
  const primary = p[key] || p[key === 'name_ar' ? 'name_en' : 'name_ar']
  if (primary) return primary
  const s = foodSearchStrings[lang]
  return `${s.unnamedPackaged} · ${s.barcodeLabel} ${retailGtin(p.gtin)}`
}

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
  // الكلمات المفتاحية تحمل الاسم **المسجَّل** فقط. حشو الباركود فيها كان يجعل
  // مفتاحنا الداخلي مادة بحث، فيطابقه المستخدم ويظنّه رقم العبوة.
  const name = pick(p.name_ar, p.name_en, '')
  return {
    id: `${OFF_ID_PREFIX}${p.gtin}`,
    nameAr: `${displayName(p, 'name_ar', lang)}${brand ? ` — ${brand}` : ''}`,
    nameEn: `${displayName(p, 'name_en', lang)}${brand ? ` — ${brand}` : ''}`,
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
