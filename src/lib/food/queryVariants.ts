/**
 * صيغ الاستعلام — **طيّ على الاستعلام وحده، لا على الفهرس**.
 *
 * ═══ لماذا هنا ولا حرفَ واحدًا داخل `foodNormalize.ts` ═══
 * `NORMALIZATION_VERSION` في `src/lib/text/foodNormalize.ts` **عقد**: رموز
 * `hot-set.json` وفهارس الشرائح على القرص بُنيت بالنسخة `1.1.0`. أي تعديل في قواعد
 * الطيّ هناك **يُبطل تلك الأرتيفكتات** — فيصير بحث الطقم الساخن صفرًا حتى تُعاد
 * البناء كلّها. ولذلك تُستهلك تلك الوحدة هنا **كما هي بلا تعديل**، ويُوسَّع
 * الاستعلام إلى صيغ بديلة بدلًا من توسيع الطيّ.
 *
 * والنتيجة أن هذا الملف آمن أمام حارة أخرى تملك `foodNormalize.ts` (طيّ الأرقام):
 * لا يشاركها سطرًا، ويرث تحسيناتها تلقائيًا لأنه يستدعيها لا ينسخها.
 *
 * ═══ ما يعالجه فعلًا ═══
 * ١. **العربية** — التشكيل والتطويل والهمزات والألف والتاء المربوطة، عبر `foldArabic`.
 *    فـ«دَجَاج» و«دجاج» و«دجـاج» استعلام واحد.
 * ٢. **جمع الإنجليزية** — `squats ⇒ squat` · `chickens ⇒ chicken` · `berries ⇒ berry`.
 *    البيانات تكتب المفرد غالبًا، والمستخدم يكتب الجمع.
 *
 * ⚠️ **الطيّ لا يخترع مطابقة.** `squat` و`squats` كلاهما يبقى صفرًا: القاعدة تطوي
 * شكل الكلمة ولا تضيف معنى، وضابط السالب في الإثبات يحرس ذلك.
 */
import { foldArabic } from '@/lib/text/foodNormalize'

/** أقصى عدد صيغ لاستعلام واحد — سقف معلَن يمنع انفجار البحث. */
export const MAX_QUERY_VARIANTS = 3

/**
 * أدنى طول كلمة لاتينية تُجرَّب صيغة مفردها.
 * دونه تُشوَّه كلمات قصيرة مشروعة: `gas ⇒ ga` · `is ⇒ i` · `abs ⇒ ab`.
 */
const MIN_SINGULARIZE_LENGTH = 4

/**
 * نهايات **ليست جمعًا** رغم انتهائها بـ`s` — تُستبعد قبل أي قاعدة.
 *
 * ⚠️ **هذا السطر كُتب بعد سقوطٍ فعليّ، لا احترازًا.** الصيغة الأولى اكتفت بشرط
 * «ألّا يسبق الـ`s` حرفُ `s`»، فنجت `grass` وسقطت `hummus ⇒ hummu` و
 * `couscous ⇒ couscou` — وكلاهما طعام في قاعدتنا. التقطه التأكيد المضادّ في
 * `scripts/run-food-meal-search-proof.mjs` قبل الشحن (§4.2: كل شدٍّ يُهاجَم).
 *
 * `ss` (grass · swiss) · `us` (hummus · couscous · citrus) · `is` (basis).
 * وتبقى `dates` و`oats` و`chips` جموعًا صحيحة لأن ما قبل الـ`s` فيها ليس منها.
 */
const NON_PLURAL_ENDINGS = /(ss|us|is)$/

/**
 * قواعد الجمع الإنجليزي — **ثلاث قواعد شكلية لا معجم**، بالترتيب: الأخصّ أولًا.
 *
 * الإغراء هو معجم صرفي كامل، وكلفته سطح صيانة لا يقابله عائد في قاعدة طعام.
 * والإغراء المعاكس (حذف كل `s` أخيرة) يفسد الأسماء أعلاه — ولذلك الحارس فوقها.
 */
const PLURAL_RULES: readonly (readonly [RegExp, string])[] = [
  [/ies$/, 'y'], // berries ⇒ berry
  [/(ch|sh|[sxz])es$/, '$1'], // sandwiches ⇒ sandwich · boxes ⇒ box
  [/([^s])s$/, '$1'], // squats ⇒ squat · chickens ⇒ chicken · dates ⇒ date
]

/** حرف لاتيني فقط — قواعد الجمع لا تُطبَّق على كلمة عربية. */
const LATIN_WORD = /^[a-z][a-z']*$/

/** يردّ كلمة لاتينية إلى مفردها إن انطبقت قاعدة، وإلا يعيدها كما هي. */
export function singularizeLatin(word: string): string {
  if (word.length < MIN_SINGULARIZE_LENGTH || !LATIN_WORD.test(word)) return word
  if (NON_PLURAL_ENDINGS.test(word)) return word
  for (const [pattern, replacement] of PLURAL_RULES) {
    if (pattern.test(word)) {
      const out = word.replace(pattern, replacement)
      // لا نقبل ردًّا يفرّغ الكلمة أو يقصّرها دون حدّ المعنى.
      if (out.length >= MIN_SINGULARIZE_LENGTH - 1) return out
    }
  }
  return word
}

/** يطبّق ردّ المفرد على كل كلمة لاتينية داخل نصّ، ويترك العربية كما هي. */
export function singularizePhrase(text: string): string {
  return text
    .split(' ')
    .map((w) => singularizeLatin(w))
    .join(' ')
}

/**
 * صيغ الاستعلام المرتّبة من الأقرب إلى الأصل: الخام ← المطويّ عربيًا ← المفرد.
 * فريدة وغير فارغة، وبحدٍّ أعلى `MAX_QUERY_VARIANTS`.
 *
 * الترتيب مقصود: من يبحث يستحق أن تُقاس مطابقته على **ما كتبه** أولًا، وتبقى
 * الصيغ المطوية احتياطًا يوسّع الاستدعاء ولا يزيح الأدقّ.
 */
export function queryVariants(raw: string): string[] {
  const base = raw.trim()
  if (!base) return []
  const folded = foldArabic(base)
  const out: string[] = []
  for (const candidate of [base, folded, singularizePhrase(folded)]) {
    const v = candidate.trim()
    if (v && !out.includes(v)) out.push(v)
    if (out.length >= MAX_QUERY_VARIANTS) break
  }
  return out
}
