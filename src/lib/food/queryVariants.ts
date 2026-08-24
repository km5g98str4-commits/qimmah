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

/**
 * أقصى عدد صيغ لاستعلام واحد — سقف معلَن يمنع انفجار البحث.
 *
 * رُفع من ٣ إلى ٤ لاستيعاب صيغة «بلا ال» أدناه. والرفع **لا يكلّف** الاستعلام
 * الخالي من «ال» شيئًا: الصيغ فريدة، فما لم تختلف الصيغة لم تُضَف أصلًا.
 */
export const MAX_QUERY_VARIANTS = 4

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
 * أدنى طول كلمة تُجرَّب صيغتها بلا «ال» — **نفس شرط `withAlDefinite`** في
 * `src/lib/text/foodNormalize.ts` (§٣٫٤). الشرطان يجب أن يتطابقا: الفهرس يولّد
 * الرمز بلا «ال» لكلمات أطول من أربعة محارف، فتجريب الاستعلام بحدٍّ آخر يصنع
 * طرفين لا يلتقيان.
 */
const MIN_AL_STRIP_LENGTH = 5

/**
 * §٣٫٤ على جانب الاستعلام — **إضافة صيغة لا حذف حرف**.
 *
 * ═══ الفجوة ═══
 * الفهرس يحمل الشكلين (بـ«ال» وبلاها) عبر `withAlDefinite`، لكن `searchFoodScored`
 * يطابق نصوص الصنف حرفيًا لا رموزه. فمن كتب «الدجاج» أو «الكبسة» أو «التمر» كان
 * يقيس استعلامه على نصّ مكتوب «دجاج» و«كبسة» و«تمر» — ولا يلتقيان.
 *
 * ═══ لماذا إضافة لا استبدال ═══
 * الحذف المدمّر يخلط «العلم» بـ«علم» و«البيك» بـ«بيك». وبإضافة صيغة تبقى
 * الصيغة الأصلية **أولى في الترتيب**، فتُقاس المطابقة على ما كتبه المستخدم أولًا
 * ولا تزيحها الصيغة المشتقّة.
 */
function stripAlDefinite(text: string): string {
  return text
    .split(' ')
    .map((w) => (w.length >= MIN_AL_STRIP_LENGTH && w.startsWith('ال') ? w.slice(2) : w))
    .join(' ')
}

/**
 * صيغ الاستعلام المرتّبة من الأقرب إلى الأصل:
 * الخام ← المطويّ عربيًا ← المفرد الإنجليزي ← بلا «ال».
 * فريدة وغير فارغة، وبحدٍّ أعلى `MAX_QUERY_VARIANTS`.
 *
 * الترتيب مقصود: من يبحث يستحق أن تُقاس مطابقته على **ما كتبه** أولًا، وتبقى
 * الصيغ المطوية احتياطًا يوسّع الاستدعاء ولا يزيح الأدقّ.
 */
export interface QueryVariant {
  value: string
  /**
   * هل هذه الصيغة **تخمين بنيوي** لا كتابةَ المستخدم ولا مجرّد تطبيع؟
   *
   * ═══ لماذا يُميَّز ═══
   * `الخام` و`المطويّ` نفس الكلمة بإملاء موحَّد — لا معنى جديد فيهما. أما ردّ
   * المفرد وحذف «ال» فيقصّان حروفًا **على أمل** أن الباقي هو الجذر، وهذا أمل قد
   * يخيب: `nuts ⇒ nut` صحيحة، لكن بادئة `nut` تلتقط **`nutella`**.
   *
   * والأثر مقيس: بحث `nuts` كان يُرجع «nutella — Ferrero» و«Nutella» **قبل**
   * «لوز» و«كاجو» المنسَّقين، لأن بادئة اسمٍ معبّأ (٤) تسبق كلمةً مفتاحية
   * منسَّقة (٧) على السلّم الموحَّد. فالتخمين كان يعلو على التنسيق البشري.
   *
   * الحلّ ليس إلغاء التخمين — فهو يكسب استدعاءً حقيقيًا — بل **وسمه**، كي تقرّر
   * طبقة الترتيب أن مطابقةً وُلدت من تخمين لا تسبق مطابقةً وُلدت من قصد.
   */
  derived: boolean
}

/**
 * صيغ الاستعلام **موسومة**: أيُّها كتابة المستخدم/تطبيعها، وأيُّها تخمين بنيوي.
 * الترتيب من الأقرب إلى الأصل، وفريدة وغير فارغة، وبحدٍّ أعلى `MAX_QUERY_VARIANTS`.
 */
export function queryVariantsDetailed(raw: string): QueryVariant[] {
  const base = raw.trim()
  if (!base) return []
  const folded = foldArabic(base)
  const singular = singularizePhrase(folded)
  const candidates: readonly QueryVariant[] = [
    { value: base, derived: false },
    { value: folded, derived: false },
    { value: singular, derived: true },
    { value: stripAlDefinite(singular), derived: true },
  ]
  const out: QueryVariant[] = []
  const seen = new Set<string>()
  for (const c of candidates) {
    const v = c.value.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, derived: c.derived })
    if (out.length >= MAX_QUERY_VARIANTS) break
  }
  return out
}

/**
 * صيغ الاستعلام المرتّبة من الأقرب إلى الأصل: الخام ← المطويّ عربيًا ← المفرد
 * الإنجليزي ← بلا «ال». فريدة وغير فارغة، وبحدٍّ أعلى `MAX_QUERY_VARIANTS`.
 *
 * الترتيب مقصود: من يبحث يستحق أن تُقاس مطابقته على **ما كتبه** أولًا، وتبقى
 * الصيغ المطوية احتياطًا يوسّع الاستدعاء ولا يزيح الأدقّ.
 */
export function queryVariants(raw: string): string[] {
  return queryVariantsDetailed(raw).map((v) => v.value)
}
