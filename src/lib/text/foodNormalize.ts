// قِمّة — التطبيع النصّي المرجعي للأطعمة والمنتجات.
//
// **السند:** `docs/execution/qimmah-postweb/SEARCH-INDEX-ARCHITECTURE.md` §٣ — مواصفة
// حاكمة يملكها المنسّق لأن البحث خيط يمرّ بين حارتين (§1.4). القواعد أدناه تنفيذٌ حرفيّ
// لها، لا اجتهاد.
//
// ═══ التطبيع حدّ اشتقاق لا حدّ تخزين ═══
// القيمة المخزَّنة والمعروضة تبقى كما وردت من المصدر حرفيًا؛ هذه الدوال تُنتج **مفتاح
// بحث مشتقًّا** بجانبها ولا تمسّ أي نصّ يراه المستخدم.
//
// ⚠️ `NORMALIZATION_VERSION` **عقد**: الفهرس المبنيّ على القرص وطيّ الاستعلام وقت
// التشغيل يجب أن يتّفقا على النسخة نفسها. أي تغيير في القواعد يرفعها **ويُبطل الفهارس**.

/**
 * نسخة عقد التطبيع.
 * • `1.0.0` — طيّ مطابق لـ`normalizeSearch` القائمة في `src/data/foodItems.ts`.
 * • `1.1.0` — تبنّي مواصفة المنسّق §٣: الياء الفارسية · الكاف/الجاف الفارسية ·
 *   علامات U+0653–U+0655 · طيّ لاتيني بـNFD · رمز إضافي بلا «ال».
 */
import { foldDigits } from '@/lib/numberFormat'

export const NORMALIZATION_VERSION = '1.1.0'

/**
 * الطيّ العربي المرجعي — تنفيذ §٣٫١ بترتيبها الملزم.
 *
 * ⚠️ **هذا الطيّ أوسع من `normalizeSearch` القائمة في `src/data/foodItems.ts`.**
 * الفروق **مقصودة ومسمّاة** (المواصفة §٣٫١ البنود ١ و٤ و٧)، ويحرسها في الإثبات
 * تأكيدٌ يثبت أن الوحدتين تتّفقان على كل ما عدا هذه الأحرف بعينها — فالتباعد
 * موثَّق لا صامت، والتوحيد لاحقًا (DEPENDENCIES D-3) يصير آمنًا.
 */
export function foldArabic(text: string): string {
  return text
    .normalize('NFD')
    // §٣٫٢ الطيّ اللاتيني: حذف العلامات المركّبة بعد NFD (é ⇒ e).
    // النطاق لاتيني بحت ولا يمسّ التشكيل العربي (U+064B فأعلى).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // §٣٫١/١ التشكيل — يشمل U+0653–U+0655 (المدّة والهمزة فوق/تحت) الغائبة عن التنفيذ القديم.
    .replace(/[ً-ْٓ-ٰٕ]/g, '')
    .replace(/ـ/g, '') // §٣٫١/٢ التطويل (ـ)
    .replace(/[أإآٱ]/g, 'ا') // §٣٫١/٣ توحيد الألف
    .replace(/[ىی]/g, 'ي') // §٣٫١/٤ الألف المقصورة **والياء الفارسية U+06CC**
    .replace(/ة/g, 'ه') // §٣٫١/٥ التاء المربوطة
    .replace(/ؤ/g, 'و') // §٣٫١/٦ الهمزة المحمولة
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[کگ]/g, 'ك') // §٣٫١/٧ الكاف والجاف الفارسيتان
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * §٣٫١/٨ — الأرقام العربية الشرقية إلى ASCII.
 *
 * مفوَّضة إلى `foldDigits` (الطبقة الرقمية القانونية) — نسخة واحدة لا ثلاث.
 * **بـ`separators:false` عمدًا:** قواعد هذا الطيّ عقد مختوم بـ`NORMALIZATION_VERSION`
 * ويُبطل توسيعُه الفهارس المبنيّة على القرص؛ فطيّ `٫`/`٬` يبقى قرار حارة الطعام
 * برفع النسخة، لا أثرًا جانبيًا لموجة الأرقام. السلوك هنا **مطابق حرفيًا** لما كان.
 */
export function foldArabicDigits(text: string): string {
  return foldDigits(text, { separators: false })
}

/** §٣٫٣ — مفتاح مطبَّع: طيّ + أرقام + علامات ترقيم فاصلة للكلمات إلى مسافة. */
export function normalizeProductKey(text: string): string {
  return foldArabicDigits(foldArabic(text))
    .replace(/[_\-–—/\\.,;:!?()[\]{}'"«»“”‘’|+*&%#@~^<>=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** الحد الأدنى لطول الرمز المفهرس. */
export const MIN_TOKEN_LENGTH = 2
/** §٤ — حدود بادئات البحث أثناء الكتابة. */
export const PREFIX_MIN = 3
export const PREFIX_MAX = 8

/**
 * §٣٫٤ — أداة التعريف «ال»: **إضافة لا استبدال**.
 * الحذف المدمّر يخلط «العلم» بـ«علم» فيولّد مطابقات كاذبة؛ توليد رمز إضافي بلا «ال»
 * يكسب الاستدعاء بلا تلك الكلفة، لأن الشكلين يُفهرسان معًا.
 */
function withAlDefinite(token: string): string[] {
  if (token.length > 4 && token.startsWith('ال')) return [token, token.slice(2)]
  return [token]
}

/** يقسّم نصًّا إلى رموز بحث مطبَّعة وفريدة، بترتيب ثابت (إعادة إنتاج حتمية). */
export function tokenize(text: string): string[] {
  const key = normalizeProductKey(text)
  if (!key) return []
  const seen = new Set<string>()
  for (const raw of key.split(' ')) {
    if (raw.length < MIN_TOKEN_LENGTH) continue
    for (const t of withAlDefinite(raw)) if (t.length >= MIN_TOKEN_LENGTH) seen.add(t)
  }
  return [...seen].sort()
}

/**
 * §٤ — بادئات كل رمز (٣–٨ محارف) لدعم البحث أثناء الكتابة بلا مسح.
 * منفصلة عن `tokenize` كي يبقى قرار «هل نتحمّل كلفة البادئات» قرار بناءٍ يُقاس،
 * لا سلوكًا مفروضًا على كل مستهلك.
 */
export function tokenizeWithPrefixes(text: string): string[] {
  const out = new Set<string>()
  for (const token of tokenize(text)) {
    out.add(token)
    const max = Math.min(token.length, PREFIX_MAX)
    for (let len = PREFIX_MIN; len < max; len++) out.add(token.slice(0, len))
  }
  return [...out].sort()
}
