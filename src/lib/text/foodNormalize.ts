// قِمّة — التطبيع النصّي المرجعي للأطعمة والمنتجات.
//
// ═══ لماذا هذا الملف موجود ═══
// طيّ الحروف العربية (التشكيل · التطويل · الألف · التاء المربوطة · الهمزات) كان
// موجودًا فعلًا في `normalizeSearch` داخل `src/data/foodItems.ts` — لكنه **محبوس**
// في ملف بيانات يزن آلاف الأسطر، فلا يستطيع خطّ إنتاج البيانات (Node) ولا مكتبة
// التمارين استعماله دون سحب القاعدة كلّها معه.
//
// فهذا الملف **ليس تنفيذًا ثانيًا** — هو نفس القواعد بحرفها، مستخرجة في وحدة نقيّة
// (بلا DOM ولا تخزين ولا استيراد بيانات) كي يشترك فيها التطبيق وخطّ الإنتاج معًا.
// و`scripts/run-food-production-proof.mjs` يحمل تأكيدًا يفشل **بالاسم** إن تباعد
// التنفيذان ولو بحرف واحد (§4.2) — فالازدواج مرصود لا مسكوت عنه.
//
// ⚠️ `NORMALIZATION_VERSION` **عقد لا تفصيلة داخلية**: فهرس البحث المبني على القرص
// وطيّ الاستعلام وقت التشغيل يجب أن يتّفقا على النسخة نفسها، وإلا صار البحث يطابق
// بقواعد غير التي بُني بها الفهرس. أي تغيير في سلوك الطيّ يرفع هذه النسخة، ويُعيد
// بناء الفهرس كلّه.

/** نسخة عقد التطبيع — تُختم في كل سجل وفي بيان كل شريحة فهرس. */
export const NORMALIZATION_VERSION = '1.0.0'

/**
 * الطيّ العربي المرجعي — **مطابق حرفيًا** لـ`normalizeSearch` في `src/data/foodItems.ts`.
 * لا يُضاف إليه ولا يُنقص منه إلا برفع `NORMALIZATION_VERSION` وإعادة بناء الفهارس.
 *
 * الترتيب مقصود: التشكيل قبل توحيد الألف (فالألف المشكَّلة تصير ألفًا عادية أولًا)،
 * والهمزة المفردة تُحذف أخيرًا بعد أن تُحلّ الهمزات المركّبة (ؤ/ئ) إلى حروفها.
 */
export function foldArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, '') // التشكيل + الألف الخنجرية
    .replace(/ـ/g, '') // التطويل (ـ)
    .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ → ا
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ؤ/g, 'و') // ؤ → و
    .replace(/ئ/g, 'ي') // ئ → ي
    .replace(/ء/g, '') // ء تُحذف
    .replace(/\s+/g, ' ')
    .trim()
}

const ARABIC_INDIC_ZERO = 0x0660 // ٠
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0 // ۰

/**
 * يحوّل الأرقام العربية الشرقية (٠-٩ و ۰-۹) إلى ASCII ويترك ما عداها كما هو.
 * منفصل عن `foldArabic` عمدًا: طيّ الحروف عقدٌ مشترك مع البحث الحيّ، وطيّ الأرقام
 * يخصّ مفاتيح المنتجات (أحجام/أوزان) — خلطهما كان سيُغيّر سلوك البحث القائم.
 */
export function foldArabicDigits(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO)
    } else if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      out += String(code - EXTENDED_ARABIC_INDIC_ZERO)
    } else {
      out += ch
    }
  }
  return out
}

/**
 * مفتاح منتج مطبَّع — يُبنى فوق `foldArabic` ويزيد عليه طيّ الأرقام وتوحيد علامات
 * الترقيم/الفواصل إلى مسافة واحدة. يُستعمل لمفاتيح إزالة التكرار وبناء الفهرس،
 * **لا** لتغيير أي نصّ معروض للمستخدم.
 */
export function normalizeProductKey(text: string): string {
  return foldArabicDigits(foldArabic(text))
    .replace(/[_\-–—/\\.,;:!?()[\]{}'"«»“”‘’|+*&%#@~^<>=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** الحد الأدنى لطول الرمز المفهرس — الحروف المفردة تُنتج قوائم ضخمة بلا قيمة تمييزية. */
export const MIN_TOKEN_LENGTH = 2

/**
 * يقسّم نصًّا إلى رموز بحث مطبَّعة وفريدة (مرتّبة ترتيبًا ثابتًا).
 * الثبات مقصود: الفهرس المبني يجب أن يكون قابلًا لإعادة الإنتاج بايتًا ببايت.
 */
export function tokenize(text: string): string[] {
  const key = normalizeProductKey(text)
  if (!key) return []
  const seen = new Set<string>()
  for (const raw of key.split(' ')) {
    if (raw.length >= MIN_TOKEN_LENGTH) seen.add(raw)
  }
  return [...seen].sort()
}
