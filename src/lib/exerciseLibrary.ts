import type { Lang } from '@/lib/appPreferences'
import { exercises } from '@/data/exercises'
import { normalizeProductKey } from '@/lib/text/foodNormalize'
import { queryVariants } from '@/lib/food/queryVariants'
import type { Exercise, Muscle } from '@/types/workout'

export interface ExerciseLibraryQuery {
  search: string
  muscle: Muscle | 'all'
  equipment: string | 'all'
  lang: Lang
}

/**
 * مرشّح المكتبة النقي. يبقى كتالوج التمارين المرجعي بلا تعديل، بينما تستخدم
 * الواجهة والإثبات السلوكي المنطق نفسه للبحث العربي/الإنجليزي ودمج الفلاتر.
 *
 * ═══ ما كان يفعله، ولماذا تغيّر (قياس لا ذوق) ═══
 * كان البحث `includes()` واحدة على `nameAr + nameEn` بعد `toLocaleLowerCase`
 * وحدها، ثم **ترتيبًا أبجديًا صرفًا**. أي: لا تطبيع عربيًا، ولا تطبيعًا لعلامات
 * الترقيم، ولا ردَّ جمع، ولا رتبةَ مطابقة إطلاقًا. والقياس على الجذع بـ١٨١ تمرينًا:
 *
 * | يكتب | كان | لماذا |
 * |---|---|---|
 * | `pull up` | **صفر** | البيانات `Pull-Up` — الشرطة تكسر المطابقة |
 * | `pullups` · `squats` · `deadlifts` | **صفر** | لا ردّ جمع |
 * | «إسكوات» | **صفر** | لا طيّ للهمزة |
 * | «تمرين الضغط» | **صفر** | لا مطابقة رموز: الكلمتان في الصنف بترتيب آخر |
 * | `squat` | «Barbell Back Squat» | الأبجدية تقرّر الصدارة لا جودة المطابقة |
 *
 * و«pull up» و«squats» ليستا حالتين طرفيتين: هما أكثر ما يُكتب فعلًا.
 *
 * ═══ لماذا استُدعيت آلات الطعام ولم تُخترع ثانية ═══
 * `normalizeProductKey` و`queryVariants` وسلّم `searchFoodScored` **مُثبَتة
 * ومحروسة** (١٣٠+ فحصًا في براهين الطعام). نسخُ منطقها هنا كان يصنع طيّين
 * يتباعدان بعد موجتين. فالمكتبة تستهلكها كما هي — وترث تحسيناتها تلقائيًا.
 * ولا يمسّ ذلك `NORMALIZATION_VERSION`: بحث التمارين في الذاكرة بحتًا، ولا فهرس
 * له على القرص يمكن أن يُبطَل.
 *
 * ═══ السلّم — نفس سلّم `searchFoodScored` بمنازله ═══
 * ٠ تطابق اسم · ١ بادئة اسم · ٢ تضمين اسم · ٣ كل رموز الاستعلام حاضرة.
 * والأبجدية **باقية** — نزلت من «القرار» إلى «كاسر التعادل داخل الرتبة الواحدة»،
 * فترتيب المتساويين في الجودة هو ترتيب اليوم حرفيًا.
 */

/** أدنى طول رمز يدخل مطابقة الرموز — دونه يطابق الرمز كل شيء تقريبًا. */
const MIN_TOKEN_LENGTH = 2
/** أدنى عدد رموز يشعل مطابقة الرموز — المفرد مغطّى بالتضمين أصلًا. */
const MIN_TOKENS = 2
/** أضعف رتبة: لا مطابقة. */
const NO_MATCH = Infinity

const tokensOf = (normalized: string): string[] =>
  normalized.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= MIN_TOKEN_LENGTH)

/** نصّ التمرين المطبَّع — يُبنى مرّة، فلا يُعاد تطبيع ١٨١ اسمًا في كل ضغطة مفتاح. */
interface ExerciseSearchText { names: readonly string[]; tokens: readonly string[] }
const SEARCH_TEXT: readonly ExerciseSearchText[] = exercises.map((e) => {
  const names = [...new Set([normalizeProductKey(e.nameAr), normalizeProductKey(e.nameEn)])].filter(Boolean)
  return { names, tokens: tokensOf(names.join(' ')) }
})

/** قوّة مطابقة تمرين واحد لصيغة استعلام **مطبَّعة**. الأصغر أقوى. */
function scoreAgainst(text: ExerciseSearchText, q: string, qTokens: readonly string[]): number {
  if (text.names.some((n) => n === q)) return 0
  if (text.names.some((n) => n.startsWith(q))) return 1
  if (text.names.some((n) => n.includes(q))) return 2
  if (qTokens.length >= MIN_TOKENS && qTokens.every((qt) => text.tokens.some((t) => t.startsWith(qt)))) return 3
  return NO_MATCH
}

export function filterExerciseLibrary({ search, muscle, equipment, lang }: ExerciseLibraryQuery): Exercise[] {
  const collator = lang === 'en' ? 'en' : 'ar'
  const byName = (a: Exercise, b: Exercise): number =>
    lang === 'en' ? a.nameEn.localeCompare(b.nameEn, 'en') : a.nameAr.localeCompare(b.nameAr, collator)

  // الصيغ تُحسب مرّة للاستعلام كلّه، لا مرّة لكل تمرين.
  const forms = queryVariants(search)
    .map((v) => normalizeProductKey(v))
    .filter(Boolean)
  const uniqueForms = [...new Set(forms)].map((q) => ({ q, tokens: tokensOf(q) }))
  const hasQuery = uniqueForms.length > 0

  const matched: { exercise: Exercise; score: number }[] = []
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i]
    if (muscle !== 'all' && exercise.primaryMuscle !== muscle) continue
    if (equipment !== 'all' && !exercise.equipment.includes(equipment)) continue
    if (!hasQuery) { matched.push({ exercise, score: 0 }); continue }

    // أقوى درجة وجدتها **أيّ** صيغة: صيغة إضافية توسّع الاستدعاء ولا تُضعف
    // مطابقةً وجدها الأصل — نفس قاعدة `rankCurated` في اتحاد بحث الطعام.
    let score = NO_MATCH
    for (const { q, tokens } of uniqueForms) {
      const s = scoreAgainst(SEARCH_TEXT[i], q, tokens)
      if (s < score) score = s
      if (score === 0) break
    }
    if (score !== NO_MATCH) matched.push({ exercise, score })
  }

  return matched
    .sort((a, b) => (a.score - b.score) || byName(a.exercise, b.exercise))
    .map((m) => m.exercise)
}
