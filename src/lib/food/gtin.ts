// قِمّة — تصنيف GTIN لخطّ إنتاج بيانات المنتجات (GTIN-8 / 12 / 13 / 14).
//
// ═══ إعادة استخدام لا ازدواج ═══
// خانة التحقّق (mod-10) وتنسيق الأرقام العربية وتوسيع UPC-E **موجودة ومختبَرة** في
// `src/features/barcode/validateBarcode.ts` (يحرسها `test:barcode`). هذا الملف
// **يستوردها ولا يعيد كتابتها**، ويضيف فوقها ما يحتاجه خطّ الإنتاج وحده:
// التوحيد إلى GTIN-14 · كشف الأكواد الزائفة · كشف النطاقات غير الصالحة للتجارة العامة.
//
// ⚠️ **بادئة GS1 لا تعني بلد المنشأ.** هي منظمة GS1 التي رخّصت البادئة للشركة،
// والشركة قد تصنّع في أي مكان. تُستعمل هنا **إشارة مرجّحة** لا ادّعاء منشأ، ولا
// تُكتب أبدًا في حقل `country` — بل في `gs1LicensingOrg` باسمه الصريح.

import { gtinCheckDigitValid, normalizeDigits } from '../../features/barcode/validateBarcode'

export type GtinLength = 8 | 12 | 13 | 14

export type GtinRejectReason =
  | 'empty'
  | 'non-digits'
  | 'length'
  | 'checksum'
  | 'placeholder'
  | 'restricted-circulation'
  | 'not-a-trade-item'

export interface GtinAccepted {
  ok: true
  /** الشكل الموحَّد: GTIN-14 بأصفار بادئة — فضاء مفاتيح **واحد** لكل الأطوال. */
  gtin14: string
  /** الكود كما ورد بعد تنسيق الأرقام فقط. */
  gtin: string
  length: GtinLength
  /** البادئة الثلاثية من شكل الـ13 خانة. */
  prefix3: string
  /** منظمة GS1 المرخِّصة — **ليست بلد المنشأ**. `null` إن كانت البادئة غير معروفة لنا. */
  gs1LicensingOrg: string | null
  /** هل البادئة مرخَّصة من منظمة خليجية؟ إشارة سوق مرجّحة لا قاطعة. */
  gulfPrefix: boolean
}

export type GtinResult = GtinAccepted | { ok: false; reason: GtinRejectReason }

/**
 * بادئات GS1 لمنظمات المنطقة — مصدرها قائمة GS1 القُطرية العامة.
 * القائمة **جزئية عمدًا**: ما لم نتحقّق منه يبقى `null` ولا يُخمَّن (§ لا تلفيق).
 */
export const GS1_PREFIX_ORG: Readonly<Record<string, string>> = {
  '607': 'Oman',
  '608': 'Bahrain',
  '611': 'Morocco',
  '613': 'Algeria',
  '619': 'Tunisia',
  '621': 'Syria',
  '622': 'Egypt',
  '624': 'Libya',
  '625': 'Jordan',
  '626': 'Iran',
  '627': 'Kuwait',
  '628': 'Saudi Arabia',
  '629': 'United Arab Emirates',
  '630': 'Qatar',
}

/** منظمات دول مجلس التعاون — تُستعمل لترجيح «سوق خليجي». */
export const GULF_ORGS: readonly string[] = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Kuwait',
  'Bahrain',
  'Qatar',
  'Oman',
]

/** بادئة السعودية — الأهمّ في ترتيب أولويات المنتج. */
export const SAUDI_PREFIX = '628'

/**
 * كود زائف؟ أكواد الاختبار/الحشو التي تمرّ من خانة التحقق أحيانًا لكنها لا تدلّ على منتج:
 * رقم واحد مكرّر · تسلسل صاعد أو نازل · قيمة عددية تافهة (أصفار بادئة تبتلع الكود).
 */
export function isPlaceholderGtin(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return true // 0000000000000 · 1111111111111
  // الجزء المعنوي: بلا خانة التحقق وبلا الأصفار البادئة.
  const body = digits.slice(0, -1).replace(/^0+/, '')
  // أقصر من 4 خانات ⇒ الأصفار ابتلعت الكود (مثل 000000000054).
  if (body.length < 4) return true
  // تسلسل صاعد/نازل في الجسم — أكواد الاختبار الشائعة (12345670) تمرّ من خانة التحقق
  // لأنها محسوبة صحيحًا، فلا يكشفها إلا فحص الجسم نفسه لا الكود الكامل.
  if (body.length >= 6) {
    const asc = '01234567890123456789'
    const desc = '98765432109876543210'
    if (asc.includes(body) || desc.includes(body)) return true
  }
  // رقم واحد مكرّر في الجسم كلّه (مثل 6111111111116).
  if (body.length >= 6 && /^(\d)\1+$/.test(body)) return true
  return false
}

/**
 * نطاقات ليست سلعًا تجارية عامّة — تُرفض لا تُقبل بعلامة، لأنها ليست منتجًا عالمي التعريف:
 * • 02 / 04 / 20–29 : تداول مقيّد داخل المتجر (غير فريدة عالميًا — نفس الكود لمنتجين).
 * • 977            : دوريات (ISSN).
 * • 978 / 979      : كتب (ISBN/ISMN).
 * • 980            : إيصالات استرداد.
 * • 981–984 / 99   : كوبونات.
 */
export function tradeItemRejection(gtin13: string): GtinRejectReason | null {
  const p2 = gtin13.slice(0, 2)
  const p3 = gtin13.slice(0, 3)
  if (p2 === '02' || p2 === '04' || (p2 >= '20' && p2 <= '29')) return 'restricted-circulation'
  if (p3 === '977' || p3 === '978' || p3 === '979' || p3 === '980') return 'not-a-trade-item'
  if (p3 >= '981' && p3 <= '984') return 'not-a-trade-item'
  if (p2 === '99') return 'not-a-trade-item'
  return null
}

/**
 * الطول التجاري لكود جُرِّد من أصفاره البادئة — الأقرب فالأقرب من أطوال GS1.
 * ٨ (EAN-8) · ١٢ (UPC-A) · ١٣ (EAN-13) · ١٤ (GTIN-14 لوحدات الشحن).
 */
const RETAIL_LENGTHS: readonly GtinLength[] = [8, 12, 13, 14]

/**
 * الشكل **التجاري** للكود — أي ما هو مطبوع على العبوة فعلًا.
 *
 * ═══ الفجوة التي يغلقها (البند ٣) ═══
 * فضاء مفاتيحنا الداخلي هو GTIN-14 بأصفار بادئة: كود EAN-8 المطبوع `17919678`
 * يُخزَّن عندنا `00000017919678`. والشكلان **ليسا نفس الشيء أمام المستخدم**:
 * الأول باركود يقرؤه على العلبة، والثاني **مفتاح فهرسة داخلي**. وعرضُ الثاني في
 * موضع يُقرأ فيه باركودًا هو بثّ معرّف داخلي في زيّ GTIN حقيقي.
 *
 * وكان ذلك يقع فعلًا: `catalogProductToFoodItem` تجعل `p.gtin` **اسم الصنف
 * المعروض** حين يخلو السجل من اسم عربي وإنجليزي معًا — والمخطّط يعترف صراحةً بأن
 * ذلك ممكن (`no_arabic_name` و`no_english_name` علمان قائمان في `QualityFlag`).
 *
 * ═══ لماذا التجريد آمن حسابيًا ═══
 * خانة التحقّق (mod-10) تُحسب بأوزان تتناوب **من اليمين**، والأصفار البادئة تسهم
 * بصفر أيًّا كان وزنها. فالكود يبقى صحيحًا عند أي طول ≥ عدد خاناته الدالّة، ولا
 * يُخترع رقم ولا يُحذف رقم دالّ.
 */
export function retailGtin(gtin14: string): string {
  const digits = normalizeDigits(String(gtin14 ?? ''))
  const significant = digits.replace(/^0+/, '')
  const length = RETAIL_LENGTHS.find((l) => significant.length <= l) ?? digits.length
  return significant.padStart(length, '0')
}

/**
 * يصنّف كودًا خامًا إلى GTIN مقبول أو سبب رفض مسمّى.
 * ملاحظة: طول 8 يُعامل **EAN-8 فقط** هنا — توسيع UPC-E مسار مسح حيّ (`validateBarcode`)
 * لا مسار استيعاب جملة، فبيانات المصادر تأتي بالشكل الكامل دائمًا.
 */
export function classifyGtin(raw: string): GtinResult {
  const digits = normalizeDigits(String(raw ?? ''))
  if (digits.length === 0) return { ok: false, reason: 'empty' }
  if (!/^\d+$/.test(digits)) return { ok: false, reason: 'non-digits' }

  const len = digits.length
  if (len !== 8 && len !== 12 && len !== 13 && len !== 14) return { ok: false, reason: 'length' }
  if (!gtinCheckDigitValid(digits)) return { ok: false, reason: 'checksum' }
  if (isPlaceholderGtin(digits)) return { ok: false, reason: 'placeholder' }

  const gtin14 = digits.padStart(14, '0')
  const gtin13 = gtin14.slice(1)
  const rejection = tradeItemRejection(gtin13)
  if (rejection) return { ok: false, reason: rejection }

  const prefix3 = gtin13.slice(0, 3)
  const org = GS1_PREFIX_ORG[prefix3] ?? null
  return {
    ok: true,
    gtin14,
    gtin: digits,
    length: len as GtinLength,
    prefix3,
    gs1LicensingOrg: org,
    gulfPrefix: org !== null && GULF_ORGS.includes(org),
  }
}
