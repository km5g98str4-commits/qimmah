// قِمّة — المخطّط المرجعي لسجل منتج غذائي معبّأ في خطّ الإنتاج.
//
// مصدر الحقيقة للأنواع هنا (داخل `src` كي يشمله `typecheck` فعلًا)، ونسخته بصيغة
// JSON Schema في `data/food-production/schema/product.schema.json` للتحقّق خارج TS.
// **الملفّان يُحرسان بتأكيد تطابق حقول** في `run-food-production-proof` — فلا ينزلق
// أحدهما عن الآخر بصمت (§4.2).

import type { NormalizationVersionStamp } from './stamps'

/** نسخة المخطّط — ترتفع عند أي تغيير في شكل السجل. */
export const PRODUCT_SCHEMA_VERSION = '1.0.0'

/** السوق المرجَّح للمنتج — ترتيب أولويات قِمّة: السعودية أولًا ثم الخليج ثم العالم. */
export type Market = 'SA' | 'GCC' | 'GLOBAL'

/** أساس القيم الغذائية. خلط الأساسين هو أشهر عطب في بيانات الأغذية، فيُصرَّح به دائمًا. */
export type NutritionBasis = 'per_100g' | 'per_100ml'

export type ServingUnit = 'g' | 'ml'

/** معرّف المصدر — قائمة مغلقة، وكل قيمة لها سجل في `manifests/sources.json`. */
export type SourceId = 'openfoodfacts' | 'usda_fdc' | 'qimmah_curated'

/**
 * أعلام الجودة — **وصف لا حكم**. وجود علم لا يعني الرفض؛ الرفض قرار منفصل
 * تتّخذه بوّابة القبول. السجل المشكوك فيه يُوسَم ولا يُصحَّح صامتًا (§5 الصدق).
 */
export type QualityFlag =
  | 'missing_energy'
  | 'missing_macros'
  | 'macro_energy_mismatch'
  | 'macro_sum_exceeds_mass'
  | 'energy_density_impossible'
  | 'negative_value'
  | 'sugar_exceeds_carbs'
  | 'fiber_exceeds_carbs'
  | 'saturated_exceeds_fat'
  | 'sodium_out_of_range'
  | 'energy_unit_suspect_kj'
  | 'serving_basis_suspect'
  | 'no_arabic_name'
  | 'no_english_name'
  | 'no_brand'
  | 'serving_size_implausible'

export interface Micronutrients {
  calcium_mg?: number
  iron_mg?: number
  potassium_mg?: number
  magnesium_mg?: number
  zinc_mg?: number
  vitamin_a_ug?: number
  vitamin_c_mg?: number
  vitamin_d_ug?: number
  vitamin_b12_ug?: number
  cholesterol_mg?: number
  caffeine_mg?: number
}

export interface ProductRecord {
  /** معرّف قِمّة الثابت: `<source>:<gtin14>` — قابل لإعادة الإنتاج بلا حالة. */
  product_id: string
  /** GTIN موحَّد إلى 14 خانة — فضاء المفاتيح الوحيد للبحث بالباركود. */
  gtin: string
  /** الكود كما ورد في المصدر (قبل التوحيد) — للتتبّع لا للمطابقة. */
  gtin_as_source: string

  name_ar: string | null
  name_en: string | null
  brand_ar: string | null
  brand_en: string | null
  manufacturer: string | null
  /** بلد/بلدان التسويق كما صرّح بها المصدر — **لا** يُشتق من بادئة GS1. */
  country: string | null
  market: Market
  category: string | null

  serving_size: number | null
  serving_unit: ServingUnit | null
  servings_per_container: number | null

  /** الأساس المُصرَّح لكل القيم الغذائية أدناه. */
  nutrition_basis: NutritionBasis
  energy_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  saturated_fat_g: number | null
  sugar_g: number | null
  fiber_g: number | null
  sodium_mg: number | null
  micronutrients: Micronutrients | null

  ingredients: string | null
  allergens: string[] | null
  /**
   * رابط الصورة — `null` **دائمًا** في هذه النسخة. صور Open Food Facts تحت
   * CC-BY-SA وتحمل بنصّ شروط OFF نفسها «حقوق أطراف ثالثة» (تصميم العبوة والعلامة
   * التجارية). فاستيرادها ليس نظيف الحقوق، وقرار المؤسس ٨ (§8) يمنع الوسائط
   * غير نظيفة الحقوق. الحقل قائم للتوسّع لا للاستعمال الآن.
   */
  image_url: string | null

  source: SourceId
  source_record_id: string
  source_url: string | null
  source_updated_at: string | null
  ingested_at: string

  /** ثقة مركّبة 0–1 — تُشتق من اكتمال الحقول وسلامة الفحوص، لا تُدخَل يدويًا. */
  confidence: number
  quality_flags: QualityFlag[]
  normalization_version: NormalizationVersionStamp
  schema_version: string
}

/**
 * قائمة الحقول العليا — **مصدر واحد** يقارنه الإثبات بـJSON Schema.
 * ترتيبها ثابت لأن كتابة السجلات مرتّبة المفاتيح (إعادة إنتاج بايتًا ببايت).
 */
export const PRODUCT_FIELDS: readonly string[] = [
  'product_id',
  'gtin',
  'gtin_as_source',
  'name_ar',
  'name_en',
  'brand_ar',
  'brand_en',
  'manufacturer',
  'country',
  'market',
  'category',
  'serving_size',
  'serving_unit',
  'servings_per_container',
  'nutrition_basis',
  'energy_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'saturated_fat_g',
  'sugar_g',
  'fiber_g',
  'sodium_mg',
  'micronutrients',
  'ingredients',
  'allergens',
  'image_url',
  'source',
  'source_record_id',
  'source_url',
  'source_updated_at',
  'ingested_at',
  'confidence',
  'quality_flags',
  'normalization_version',
  'schema_version',
]

export const QUALITY_FLAGS: readonly QualityFlag[] = [
  'missing_energy',
  'missing_macros',
  'macro_energy_mismatch',
  'macro_sum_exceeds_mass',
  'energy_density_impossible',
  'negative_value',
  'sugar_exceeds_carbs',
  'fiber_exceeds_carbs',
  'saturated_exceeds_fat',
  'sodium_out_of_range',
  'energy_unit_suspect_kj',
  'serving_basis_suspect',
  'no_arabic_name',
  'no_english_name',
  'no_brand',
  'serving_size_implausible',
]
