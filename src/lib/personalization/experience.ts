// تصنيف الخبرة — نقاط موزونة من ثماني إشارات، لا من سؤال واحد.
//
// ═══ المبدأ الحاكم ═══
// «من عنده اشتراك ٣ سنوات وتمرّن متقطّعًا قد يكون مبتدئًا أو متوسّطًا مبكرًا»
// (§2 من المواصفة). ولذلك **`totalMonths` وحده لا يرفع أحدًا فوق المبتدئ**:
// وزنه 1.5 مقابل 2.0 للانتظام، ومقابل 1.5 لخبرة البرامج. المدّة تقول «كم مرّ»،
// والانتظام يقول «كم تدرّب فعلًا» — والثاني هو ما يبني القدرة.
//
// ═══ ولماذا التقييم الذاتي وزنه منخفض ═══
// `selfLevel` وزنه 1.0 — أدنى من الانتظام والبرامج. ليس تشكيكًا بالمستخدم بل
// لأن التقدير الذاتي في التدريب معروف الانحياز في الاتجاهين: المبتدئ الواثق
// يرفع نفسه، والمتقدّم المتواضع يخفض نفسه. فيدخل إشارةً لا حكمًا — وتناقضه مع
// المحسوب هو ما يفجّر سؤال التوضيح `c-level-mismatch` بدل أن يُبتلع.

import type { AnswerValue, ExperienceClass, ExperienceVerdict, PersonalizationState } from './types'

interface SignalDef {
  /** مفتاح الإجابة. */
  key: string
  weight: number
  /** خريطة القيمة ← نقطة 0..5. رقمية؟ تُمرَّر عبر `scale`. */
  map?: Record<string, number>
  scale?: (v: number) => number
}

/**
 * الإشارات وأوزانها. **الأوزان مُعلَنة هنا وحدها** — تغييرها تغيير خوارزمية
 * يرفع `ALGO_VERSION`، لا تعديل تجميلي.
 */
export const EXPERIENCE_SIGNALS: readonly SignalDef[] = [
  { key: 'consistency', weight: 2.0, map: { rare: 0, on_off: 1.5, mostly: 3.5, steady: 5 } },
  { key: 'trainedBefore', weight: 2.0, map: { never: 0, tried: 1, months: 3, years: 5 } },
  { key: 'totalMonths', weight: 1.5, map: { lt3: 1, m3_6: 2, m6_12: 3, y1_3: 4, y3_plus: 5 } },
  { key: 'programExperience', weight: 1.5, map: { never: 0, app_only: 2, followed: 3.5, wrote_own: 5 } },
  { key: 'knowsProgression', weight: 1.3, map: { no: 0, vaguely: 2.5, yes: 5 } },
  { key: 'exerciseFamiliarity', weight: 1.2, map: { none: 0, few: 1.5, most: 3.5, all: 5 } },
  { key: 'trainingAgeHonest', weight: 1.2, map: { lt1: 1, y1_2: 2.5, y2_5: 4, gt5: 5 } },
  { key: 'tracksSets', weight: 1.0, map: { never: 0, sometimes: 2.5, always: 5 } },
  { key: 'selfLevel', weight: 1.0, map: { beginner: 1, intermediate: 3, advanced: 5 } },
  { key: 'gymConfidence', weight: 0.8, scale: (v) => Math.max(0, Math.min(5, v - 1)) * 1.25 },
]

/** عتبات النقاط (0..100). الحدود شاملة من الأسفل. */
export const CLASS_THRESHOLDS: readonly { min: number; klass: ExperienceClass }[] = [
  { min: 75, klass: 'advanced' },
  { min: 55, klass: 'intermediate' },
  { min: 38, klass: 'early_intermediate' },
  { min: 18, klass: 'beginner' },
  { min: 0, klass: 'complete_beginner' },
]

function readSignal(def: SignalDef, answers: Record<string, AnswerValue>): number | null {
  const raw = answers[def.key]
  if (raw === undefined || raw === null) return null
  if (def.scale) {
    const n = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(n) ? def.scale(n) : null
  }
  if (def.map && typeof raw === 'string') {
    const v = def.map[raw]
    return typeof v === 'number' ? v : null
  }
  return null
}

/** هل انقطع عن التدريب مدّة تجعله «عائدًا» لا مبتدئًا ولا متوسّطًا كاملًا؟ */
function isReturning(answers: Record<string, AnswerValue>): boolean {
  const away = answers.lastTrained
  if (away !== 'm3_12' && away !== 'y1_plus') return false
  // العودة تفترض رصيدًا سابقًا حقيقيًا — من تمرّن شهرين قبل سنتين ليس «عائدًا».
  const total = answers.totalMonths
  return total === 'm6_12' || total === 'y1_3' || total === 'y3_plus'
}

/**
 * يصنّف الخبرة. **نقيّ تمامًا**: نفس الإجابات ⇒ نفس المخرج، بلا وقت ولا تخزين
 * ولا نموذج لغوي (§9 من المواصفة).
 */
export function classifyExperience(state: PersonalizationState): ExperienceVerdict {
  const answers = state.answers
  const signals: Record<string, number> = {}
  let weighted = 0
  let weightSeen = 0
  let weightTotal = 0

  for (const def of EXPERIENCE_SIGNALS) {
    weightTotal += def.weight
    const v = readSignal(def, answers)
    if (v === null) continue
    signals[def.key] = v
    weighted += v * def.weight
    weightSeen += def.weight
  }

  // لا إشارة واحدة بعد ⇒ لا تصنيف مصطنع. المبتدئ الكامل هو الافتراض **الآمن**:
  // يعطي أبسط لغة وأقلّ حِمل، وهو الخطأ الأرخص إن كان خطأً.
  if (weightSeen === 0) {
    return { klass: 'complete_beginner', confidence: 0, signals, score: 0 }
  }

  const score = (weighted / weightSeen) * 20 // 0..5 ⇒ 0..100

  // قاعدة قاطعة تسبق النقاط: من لم يتمرّن قط مبتدئ كامل مهما قال عن نفسه.
  let klass: ExperienceClass =
    answers.trainedBefore === 'never'
      ? 'complete_beginner'
      : (CLASS_THRESHOLDS.find((t) => score >= t.min)?.klass ?? 'complete_beginner')

  if (klass !== 'complete_beginner' && isReturning(answers)) klass = 'returning'

  // الثقة = تغطية الإشارات × اتّساقها مع التقييم الذاتي.
  const coverage = weightSeen / weightTotal
  const selfScore = typeof answers.selfLevel === 'string' ? { beginner: 1, intermediate: 3, advanced: 5 }[answers.selfLevel] : undefined
  const agreement = selfScore === undefined ? 0.85 : 1 - Math.min(1, Math.abs(selfScore * 20 - score) / 60)
  const confidence = Math.round(Math.max(0, Math.min(1, coverage * 0.6 + agreement * 0.4)) * 100) / 100

  return { klass, confidence, signals, score: Math.round(score * 10) / 10 }
}

/** حالة التدريب — مستقلّة عن التصنيف: «كم يتدرّب الآن» لا «كم يعرف». */
export function classifyTrainingStatus(state: PersonalizationState): 'never' | 'detrained' | 'inconsistent' | 'consistent' {
  const a = state.answers
  if (a.trainedBefore === 'never') return 'never'
  if (a.lastTrained === 'm3_12' || a.lastTrained === 'y1_plus') return 'detrained'
  if (a.consistency === 'steady' || a.consistency === 'mostly') return 'consistent'
  return 'inconsistent'
}
