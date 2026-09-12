// ═══════════════════════════════════════════════════════════════════════════
//  مطابقة المدخل بالسؤال — [SOVEREIGN-COACH-001].
//
//  ═══ لماذا لا يوجد مسار احتياطي ═══
//  الطقم مغلق (`COACH_QUESTIONS`). فالمدخل الذي لا يطابق **لا يُخمَّن له جواب**
//  ولا يُدفَع إلى أقرب سؤال؛ يُقابَل بقائمة القدرات. الخسارة أن يُعاد صوغ
//  السؤال، والمكسب ألّا يُجاب سؤالٌ لم يُسأل بجوابٍ يبدو واثقًا.
//
//  ═══ الوزن يفصل «الموضوع» عن «الأداة» ═══
//  كلمة الاستفهام («ليش» · why) **أداة**: تظهر في سؤالين ولا تحسم أيًّا منهما.
//  وكلمة الموضوع («سعرات» · «ابدل») **تحسم**. فالموضوع بثلاث والأداة بواحدة،
//  والقبول مشروط بموضوع واحد على الأقل **وبتفوّق قاطع** — التعادل يذهب إلى
//  قائمة القدرات لا إلى قرعة.
// ═══════════════════════════════════════════════════════════════════════════

import { normalizeArabic } from './safety'
import { COACH_QUESTIONS, type CoachQuestionId } from './types'

const TOPIC_WEIGHT = 3
const HINT_WEIGHT = 1

/**
 * تطبيع الاستعلام: يوحّد صور الألف والياء والتاء المربوطة، ويُسقط الترقيم.
 * فـ«الخطّة؟» و«الخطه» و«الخطة» شيء واحد أمام الجدول.
 */
export function normalizeQuery(raw: string): string {
  return normalizeArabic(raw)
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[^\w؀-ۿ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface QuestionMatcher {
  topics: readonly string[]
  hints: readonly string[]
}

/** كل المفاتيح مكتوبة **بصيغتها بعد التطبيع** — وإلا لما طابقت شيئًا. */
const MATCHERS: Readonly<Record<CoachQuestionId, QuestionMatcher>> = {
  todayPlan: {
    topics: ['اليوم', 'اسوي', 'اسويه', 'today', 'تمريني اليوم'],
    hints: ['وش', 'ايش', 'what', 'should', 'تمرين', 'برنامجي'],
  },
  whyThisExercise: {
    topics: ['ليش اخترت', 'ليش هذا', 'ليش هالتمرين', 'ليش الخطه', 'why this', 'why did you', 'why my plan'],
    hints: ['تمرين', 'exercise', 'خطه', 'plan', 'اخترت', 'chose', 'picked'],
  },
  missedYesterday: {
    topics: ['فاتني', 'فاتتني', 'امس', 'فوت', 'yesterday', 'missed', 'ما تمرنت'],
    hints: ['الحين', 'now', 'skip', 'وش'],
  },
  canSubstitute: {
    topics: ['ابدل', 'استبدل', 'بديل', 'بدايل', 'substitute', 'swap', 'alternative', 'replace'],
    hints: ['تمرين', 'exercise', 'اقدر', 'can i'],
  },
  whyCaloriesChanged: {
    // [COACH-002] أسئلة الأهداف الغذائية كلّها هنا (بروتين · كارب · دهون · ماكروز):
    // الجواب يشرح كيف حُسبت الأهداف من ملفّك — وهو ما يسأل عنه «كم بروتين آكل؟».
    topics: ['سعرات', 'سعراتي', 'كالوري', 'calorie', 'calories', 'بروتين', 'كارب', 'دهون', 'ماكروز', 'protein', 'carbs', 'macros', 'اهدافي', 'targets'],
    hints: ['ليش', 'why', 'رقم', 'number', 'هدفي', 'target', 'كم', 'how much', 'how many', 'اكل', 'eat'],
  },
  progressTrend: {
    topics: ['تقدمي', 'تقدم', 'progress', 'نتايجي', 'نتائجي', 'improving', 'how am i doing'],
    hints: ['كيف', 'how', 'ادائي', 'تحسن'],
  },
}

export interface IntentScore {
  question: CoachQuestionId
  score: number
  /** المفاتيح التي طابقت — تُطبع في الإثبات فلا يكون «طابَق» ادّعاءً بلا سبب. */
  matched: string[]
}

/** نتيجة كل سؤال، مرتّبة تنازليًا. أداة تشخيص وإثبات لا واجهة. */
export function scoreQuestions(raw: string): IntentScore[] {
  const text = normalizeQuery(raw)
  const scores: IntentScore[] = COACH_QUESTIONS.map((question) => {
    const { topics, hints } = MATCHERS[question]
    const matched: string[] = []
    let score = 0
    for (const t of topics) {
      if (text.includes(t)) {
        score += TOPIC_WEIGHT
        matched.push(t)
      }
    }
    for (const h of hints) {
      if (text.includes(h)) {
        score += HINT_WEIGHT
        matched.push(h)
      }
    }
    return { question, score, matched }
  })
  return scores.sort((a, b) => b.score - a.score || a.question.localeCompare(b.question))
}

/**
 * السؤال المطابق أو `null`. الشرطان: موضوع واحد على الأقل (`>= TOPIC_WEIGHT`)
 * **وتفوّق قاطع** على التالي. التعادل ⇒ `null` ⇒ قائمة القدرات.
 */
export function matchCoachQuestion(raw: string): CoachQuestionId | null {
  if (!raw.trim()) return null
  const [best, second] = scoreQuestions(raw)
  if (!best || best.score < TOPIC_WEIGHT) return null
  if (second && second.score === best.score) return null
  return best.question
}
