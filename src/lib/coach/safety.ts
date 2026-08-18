// ═══════════════════════════════════════════════════════════════════════════
//  حارسا المفردات — [SOVEREIGN-003] حارة المرشد.
//
//  ═══ لماذا حارسان لا واحد ═══
//  المرشد يقف بين محظورين مختلفين تمامًا:
//
//    ١) **ادّعاء طبي.** «يعالج ركبتك» جملة تُقال بحسن نيّة وتصير مسؤولية.
//       يحرسها `findMedicalClaims`.
//
//    ٢) **تسويق نموذج.** `docs/product/BACKLOG.md:32` يخرج «المدرب الذكي» من
//       النطاق. المبنيّ هنا **محرّك قواعد حتمي** يقرأ خطة المستخدم وسجلّه —
//       لا نموذج ولا شبكة ولا محادثة. فتسميته «ذكيًا» كذبة على المستخدم
//       **وخرق نطاق** في آنٍ واحد. يحرسها `findModelMarketing`.
//
//  ═══ الاستثناء الوحيد ومَن يحرسه (الميثاق §4.2) ═══
//  إعفاء واحد فقط في `findMedicalClaims`: **النفي**. «مو استشارة طبية» ليست
//  ادّعاءً بل تبرئة منه، ومنعُها يمنع التنويه نفسه. والإعفاء **ضيّق ومحروس**:
//  نافذة ثلاث كلمات داخل **الجملة الواحدة** — فـ«ما عندك خطة. هذا يعالج إصابتك»
//  لا يُعفى، لأن النافي في جملة أخرى. ويحرس ذلك تأكيد مضادّ مسمّى في
//  `scripts/run-coach-surface-proof.mjs` يسقط باسمه لو صار الإعفاء قاعدة.
//
//  كلا الحارسين **دالّتان نقيّتان** على نصّ — تُشغَّلان على القاموس كلّه في
//  الإثبات، لا على تعليقات المصدر (فهذا الملف نفسه يذكر المحظور ليعرّفه).
// ═══════════════════════════════════════════════════════════════════════════

export interface VocabularyHit {
  /** الجذر المحظور كما هو مسجَّل في القائمة — يُسمّى في المخرجات. */
  term: string
  /** الجملة التي وقع فيها — للتشخيص لا للعرض. */
  clause: string
}

/** حروف تُلصق ببداية الكلمة العربية ولا تغيّرها (ال · و · ف · ب · ل · ك). */
const AR_PREFIX = '(?:[وفبلك]?(?:ال)?)'

/**
 * مفردات الادّعاء الطبي. **جذور لا جمل**: نطابق الجذر ثم نتحقّق من الحدّ يدويًا،
 * فلا يُصطاد «secure» بسبب «cure» ولا «برغل» بسبب جذر آخر.
 */
export const MEDICAL_TERMS: readonly string[] = [
  'يعالج', 'تعالج', 'علاج', 'يشفي', 'شفاء', 'يداوي', 'دواء', 'أدوية',
  'تشخيص', 'يشخّص', 'وصفة', 'جرعة', 'مرض', 'أمراض', 'أعراض', 'طبي', 'طبية',
  'استشارة', 'تأهيل',
  'diagnose', 'diagnosis', 'treat', 'treats', 'treatment', 'cure', 'cures',
  'heal', 'heals', 'prescribe', 'prescription', 'dose', 'dosage', 'disease',
  'symptom', 'symptoms', 'therapy', 'medical', 'medicine', 'medication', 'remedy',
]

/** مفردات تسويق النموذج — كل ما يوهم أن شيئًا «يفكّر» خلف الجواب. */
export const MODEL_MARKETING_TERMS: readonly string[] = [
  'ذكي', 'ذكية', 'ذكاء', 'اصطناعي', 'يفكّر', 'يفكر', 'يتعلّم منك', 'خوارزمية ذكية',
  'ai', 'a.i.', 'artificial intelligence', 'smart', 'smarter', 'intelligent',
  'intelligence', 'neural', 'machine learning', 'chatbot', 'gpt', 'llm',
]

/** نوافي تُعفي المفردة الطبية التالية لها — «مو استشارة طبية» تنويه لا ادّعاء. */
const NEGATORS: readonly string[] = ['مو', 'ما', 'مب', 'ليس', 'ليست', 'بدون', 'لا', 'not', "isn't", 'never', 'no']

const NEGATION_WINDOW = 3

/** أي محرف يفصل جملة عن أختها — الإعفاء لا يعبر هذا الحدّ. */
const CLAUSE_SPLIT = /[.،,;؛!؟?\n\r·|]+/

/** محارف تُعدّ جزءًا من الكلمة (عربي + لاتيني + أرقام + نقطة داخلية). */
const WORD_CHARS = /[A-Za-z0-9ء-ي٠-٩'.]+/g

const stripDiacritics = (s: string): string => s.replace(/[ً-ْـ]/g, '')

const normalise = (s: string): string =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')

const prefixStripper = new RegExp(`^${AR_PREFIX}`)

/** يجرّد السوابق العربية الملتصقة قبل المطابقة — «والعلاج» ⇐ «علاج». */
const bare = (token: string): string => {
  const n = normalise(token).replace(/^[«"'(]+|[»"')،.]+$/g, '')
  const stripped = n.replace(prefixStripper, '')
  return stripped.length >= 3 ? stripped : n
}

function matches(token: string, term: string): boolean {
  const t = normalise(term)
  const b = bare(token)
  const n = normalise(token)
  // مطابقة كلمة كاملة، أو بلاحقة تصريفية قصيرة (ها/هم/ك/ات/s) **للجذور الطويلة
  // فقط**. الجذر القصير (٣ محارف فأقل) يُطابَق تطابقًا تامًا لا غير: بدون هذا
  // القيد يصطاد «طبي» كلمةَ «طبيعي»، ويصطاد «ai» كلمةَ «aim» — وحارس يصطاد
  // البريء يُطفَأ بعد يومين فلا يحرس شيئًا.
  const full = (candidate: string) =>
    candidate === t || (t.length >= 4 && candidate.startsWith(t) && candidate.length - t.length <= 3)
  return full(b) || full(n)
}

function scan(text: string, terms: readonly string[], negationAware: boolean): VocabularyHit[] {
  const hits: VocabularyHit[] = []
  for (const clause of text.split(CLAUSE_SPLIT)) {
    const tokens = clause.match(WORD_CHARS)
    if (!tokens) continue
    const isNegator = tokens.map((tok) => NEGATORS.some((n) => normalise(tok) === normalise(n)))
    tokens.forEach((token, i) => {
      for (const term of terms) {
        if (!matches(token, term)) continue
        if (negationAware) {
          const from = Math.max(0, i - NEGATION_WINDOW)
          if (isNegator.slice(from, i).some(Boolean)) return
        }
        hits.push({ term, clause: clause.trim() })
        return
      }
    })
  }
  return hits
}

/**
 * ادّعاءات طبية في نصّ. **يُعفي المنفيّ** ضمن نافذة ثلاث كلمات داخل الجملة
 * الواحدة، فيبقى التنويه «مو استشارة طبية» ممكنًا بلا أن يصير الإعفاء بابًا.
 */
export function findMedicalClaims(text: string): VocabularyHit[] {
  return scan(text, MEDICAL_TERMS, true)
}

/**
 * تسويق النموذج. **لا إعفاء بالنفي هنا عمدًا**: «مو ذكي» جملة لا داعي لها في
 * واجهة لا تدّعي الذكاء أصلًا، وفتحُ الإعفاء يفتح «مساعد ذكي… مو ذكي تمامًا».
 */
export function findModelMarketing(text: string): VocabularyHit[] {
  return scan(text, MODEL_MARKETING_TERMS, false)
}
