// قِمّة — تطبيع سجل منتج خام إلى المخطّط المرجعي.
// يحفظ القيم الخام كما وردت (لا يُصحّح صامتًا)، ويحوّل الوحدات بقواعد معلنة.

import { SAUDI_PREFIX } from './constants.mjs'

/** كيلوجول → سعرة حرارية (المعامل القياسي). */
export const KJ_PER_KCAL = 4.184
/** ملح → صوديوم (المعامل القياسي المعتمد في بطاقات الأغذية). */
export const SALT_TO_SODIUM = 2.5

const ARABIC_RE = /[؀-ۿ]/

export const hasArabic = (s) => typeof s === 'string' && ARABIC_RE.test(s)

/** رقم صالح أو null — الفراغ والنص غير الرقمي والـNaN كلّها null لا صفر. */
export function num(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** يقصّ نصًّا ويعيد null للفارغ — كي لا تدخل سلاسل فارغة إلى الحقول. */
export function str(v) {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s.length ? s : null
}

/**
 * يستخرج حجم الحصّة ووحدتها من نصّ حرّ.
 * يقبل «330 ml» · «30g» · «1 portion (25 g)» · «٣٠ غ» (بعد طيّ الأرقام).
 * يفضّل الرقم **داخل القوسين** إن وُجد، لأنه الوزن الفعلي لا عدد القطع.
 */
export function parseServing(raw, foldDigits) {
  const text = foldDigits(String(raw ?? '')).toLowerCase()
  if (!text.trim()) return { serving_size: null, serving_unit: null }
  const paren = text.match(/\(([^)]*)\)/)
  const search = [paren?.[1], text].filter(Boolean)
  for (const chunk of search) {
    // الوحدات العربية مدرجة صراحةً: بيانات السعودية تكتب «٢٥٠ مل» و«٣٠ غ» لا «250 ml».
    // بلا هذا السطر كان حجم الحصّة يسقط null لكل سجل عربي — وهو أكثر ما يهمّ المنتج.
    const m = chunk.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|g|gr|gram|grammes?|mg|ml|cl|l|litre|liter|كجم|كغم|كغ|مل|غرام|جرام|غم|جم|غ|ج|لتر|ل)(?![a-z\u0600-\u06FF])/)
    if (!m) continue
    let value = Number(m[1].replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) continue
    let unit = m[2]
    const AR = { 'كجم': 'kg', 'كغم': 'kg', 'كغ': 'kg', 'مل': 'ml', 'غرام': 'g', 'جرام': 'g', 'غم': 'g', 'جم': 'g', 'غ': 'g', 'ج': 'g', 'لتر': 'l', 'ل': 'l' }
    if (AR[unit]) unit = AR[unit]
    if (unit === 'kg') return { serving_size: value * 1000, serving_unit: 'g' }
    if (unit === 'mg') return { serving_size: value / 1000, serving_unit: 'g' }
    if (unit === 'l' || unit === 'litre' || unit === 'liter') return { serving_size: value * 1000, serving_unit: 'ml' }
    if (unit === 'cl') return { serving_size: value * 10, serving_unit: 'ml' }
    if (unit === 'ml') return { serving_size: value, serving_unit: 'ml' }
    return { serving_size: value, serving_unit: 'g' }
  }
  return { serving_size: null, serving_unit: null }
}

/**
 * الطاقة بالسعرات — بترتيب ثقة معلن:
 *   ١. `energy-kcal_100g` (سعرات مصرَّحة).
 *   ٢. `energy-kj_100g` ÷ 4.184.
 *   ٣. `energy_100g` — حقل OFF العام و**وحدته كيلوجول**، فيُقسَّم كذلك.
 * يعيد المصدر المستعمل كي يُوسَم السجل عند الاشتباه بخلط الوحدات.
 */
export function resolveEnergyKcal(row) {
  const kcal = num(row['energy-kcal_100g'])
  if (kcal !== null && kcal > 0) return { energy_kcal: kcal, energy_from: 'kcal_field' }
  const kj = num(row['energy-kj_100g'])
  if (kj !== null && kj > 0) return { energy_kcal: kj / KJ_PER_KCAL, energy_from: 'kj_field' }
  const generic = num(row['energy_100g'])
  if (generic !== null && generic > 0) return { energy_kcal: generic / KJ_PER_KCAL, energy_from: 'energy_field_kj' }
  return { energy_kcal: null, energy_from: 'none' }
}

/**
 * الصوديوم بالمليغرام. OFF يخزّن `sodium_100g` و`salt_100g` **بالغرام**.
 * يُفضَّل الصوديوم المصرَّح، وإلا يُشتق من الملح ÷ 2.5.
 */
export function resolveSodiumMg(row) {
  const sodiumG = num(row['sodium_100g'])
  if (sodiumG !== null && sodiumG >= 0) return { sodium_mg: sodiumG * 1000, sodium_from: 'sodium_field' }
  const saltG = num(row['salt_100g'])
  if (saltG !== null && saltG >= 0) return { sodium_mg: (saltG / SALT_TO_SODIUM) * 1000, sodium_from: 'salt_field' }
  return { sodium_mg: null, sodium_from: 'none' }
}

/** أساس القيم: سائل ⇒ per_100ml. الإشارة من وحدة الحصّة أو من فئة/كمّية المنتج. */
export function resolveBasis(servingUnit, quantityText) {
  if (servingUnit === 'ml') return 'per_100ml'
  if (/\b\d+\s*(ml|cl|l|litre|liter)\b/i.test(String(quantityText ?? ''))) return 'per_100ml'
  return 'per_100g'
}

const GCC_COUNTRY_RE = /saudi|united arab emirates|\buae\b|kuwait|bahrain|qatar|\boman\b|السعودي|الامارات|الكويت|البحرين|قطر|عمان/i
const SAUDI_COUNTRY_RE = /saudi|السعودي/i

/**
 * تصنيف السوق. **بلد التصريح أولًا** (المصدر يعلنه)، وبادئة GS1 **إشارة مرجّحة** فقط
 * لأنها تعرّف المنظمة المرخِّصة لا بلد المنشأ ولا بلد البيع.
 */
export function resolveMarket(countriesText, gtinInfo) {
  const c = String(countriesText ?? '')
  if (SAUDI_COUNTRY_RE.test(c)) return 'SA'
  if (GCC_COUNTRY_RE.test(c)) return 'GCC'
  if (gtinInfo?.prefix3 === SAUDI_PREFIX) return 'SA'
  if (gtinInfo?.gulfPrefix) return 'GCC'
  return 'GLOBAL'
}

/** يفصل اسمًا ثنائي اللغة إلى عربي/إنجليزي حسب وجود حروف عربية. */
export function splitByScript(value) {
  const s = str(value)
  if (!s) return { ar: null, en: null }
  const parts = s.split(/\s*[,;|]\s*/).map((p) => p.trim()).filter(Boolean)
  const ar = parts.find(hasArabic) ?? (hasArabic(s) ? s : null)
  const en = parts.find((p) => !hasArabic(p)) ?? (hasArabic(s) ? null : s)
  return { ar: ar ?? null, en: en ?? null }
}

/** مسبّبات الحساسية: وسوم OFF تأتي بصيغة «en:milk» — نُبقي الاسم فقط. */
export function parseAllergens(raw) {
  const s = str(raw)
  if (!s) return null
  const out = [...new Set(s.split(',').map((t) => t.trim().replace(/^[a-z]{2}:/, '').replace(/[-_]+/g, ' ').trim()).filter(Boolean))]
  return out.length ? out.sort() : null
}

const MICRO_MAP = [
  ['calcium_mg', 'calcium_100g', 1000],
  ['iron_mg', 'iron_100g', 1000],
  ['potassium_mg', 'potassium_100g', 1000],
  ['magnesium_mg', 'magnesium_100g', 1000],
  ['zinc_mg', 'zinc_100g', 1000],
  ['vitamin_a_ug', 'vitamin-a_100g', 1000000],
  ['vitamin_c_mg', 'vitamin-c_100g', 1000],
  ['vitamin_d_ug', 'vitamin-d_100g', 1000000],
  ['vitamin_b12_ug', 'vitamin-b12_100g', 1000000],
  ['cholesterol_mg', 'cholesterol_100g', 1000],
  ['caffeine_mg', 'caffeine_100g', 1000],
]

/** المغذّيات الدقيقة — OFF يخزّنها بالغرام، فتُحوَّل لوحدتها المعتادة. */
export function parseMicronutrients(row) {
  const out = {}
  for (const [field, col, factor] of MICRO_MAP) {
    const v = num(row[col])
    if (v !== null && v > 0) out[field] = v * factor
  }
  return Object.keys(out).length ? out : null
}
