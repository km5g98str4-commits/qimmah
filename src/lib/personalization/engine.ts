// محرّك التفرّع — أيّ سؤال يستحق الطرح الآن؟
//
// ═══ الترتيب الحاكم (لا يُخالَف) ═══
//   0. **الموافقة الصحية** — بوابة مطلقة. لا سؤال جامع للبيانات قبلها، بلا استثناء.
//   1. **توضيح تناقض** — جوابان لا يجتمعان يوقفان التقدّم حتى يُحسما.
//   2. **إلزامي ناقص** — ما لا تقوم الخطة بدونه.
//   3. **طابور المتابعات** — ما فتحته إجابة سابقة.
//   4. **الأعلى (أولوية ثم مكسب معلومة)** من الباقي المؤهَّل.
//
// ═══ لماذا لا يوجد `if` واحد يخصّ سؤالًا بعينه هنا ═══
// كل شرط تفرّع بيانات في البنك، والمحرّك يقيّمها. أضف سؤالًا ⇒ لا يتغيّر سطر
// هنا. هذا هو الفرق العملي بين محرّك و«سلسلة `if` عملاقة» التي يمنعها §20.
//
// ═══ والتوقّف ليس رقمًا وحده ═══
// نتوقّف حين **يكتمل الإلزامي** و**يُبلَغ الحدّ الأدنى**، أو حين يُبلَغ الحدّ
// الأقصى. ولا نطرح سؤالًا لمجرّد بلوغ رقم: إن نفدت الأسئلة النافعة قبل الحدّ
// الأدنى نتوقّف ونُعلن `reason: 'exhausted'` بدل حشو (§8 من المواصفة).

import { QUESTION_BANK, QUESTION_BY_ID, getQuestion } from './bank'
import { classifyExperience, classifyTrainingStatus } from './experience'
import { unresolvedConflicts } from './contradictions'
import { evaluate } from './rules'
import { ADULT_AGE } from './constants'
import {
  ABSOLUTE_QUESTION_CAP,
  ALGO_VERSION,
  BANK_VERSION,
  DEFAULT_BUDGET,
  STATE_VERSION,
  type AnswerValue,
  type ExperienceClass,
  type FlowBudget,
  type PersonalizationState,
  type QuestionDef,
  type QuestionId,
} from './types'
import type { Lang } from '@/lib/appPreferences'

/** بوابة الموافقة — معرّفها ثابت، ويحرسه الإثبات بفحص مسمّى. */
export const CONSENT_QUESTION_ID = 's-health-consent'

export interface EngineConfig {
  budget: Record<ExperienceClass, FlowBudget>
  /** ساعة قابلة للحقن — الاختبار يحتاج زمنًا حتميًا لا `Date.now()`. */
  now: () => number
}

export const DEFAULT_CONFIG: EngineConfig = {
  budget: DEFAULT_BUDGET,
  now: () => Date.now(),
}

// ————————————————————————— إنشاء الحالة —————————————————————————

export function createState(lang: Lang, userId: string | null = null, now = Date.now()): PersonalizationState {
  const state: PersonalizationState = {
    stateVersion: STATE_VERSION,
    bankVersion: BANK_VERSION,
    algoVersion: ALGO_VERSION,
    userId,
    lang,
    answers: {},
    derived: {},
    history: [],
    queue: [],
    clarifications: [],
    startedAt: now,
    updatedAt: now,
    completedAt: null,
  }
  return recomputeDerived(state)
}

// ————————————————————————— الإشارات المشتقّة —————————————————————————

/**
 * يعيد بناء كل ما يُشتقّ من الإجابات. **يُستدعى بعد كل إجابة وبعد كل تحميل** —
 * وهذا ما يجعل الحالة المحمَّلة من التخزين مكافئة للحالة المبنيّة حيًّا، فلا
 * تنشأ حالة «مسوّدة تحمل علمًا قديمًا لتناقض حُلّ».
 */
export function recomputeDerived(state: PersonalizationState): PersonalizationState {
  const verdict = classifyExperience(state)
  const derived: Record<string, string | number | boolean> = { ...state.derived }

  derived.experienceClass = verdict.klass
  derived.experienceConfidence = verdict.confidence
  derived.experienceScore = verdict.score
  derived.trainingStatus = classifyTrainingStatus(state)

  const age = state.answers.age
  derived.isMinor = typeof age === 'number' && Number.isFinite(age) && age < ADULT_AGE
  derived.askedCount = countedAsked(state)

  // أعلام التناقض تُمسح ثم تُكتب — علم بائت أسوأ من غيابه.
  for (const key of Object.keys(derived)) {
    if (key.startsWith('conflict_')) delete derived[key]
  }
  for (const c of unresolvedConflicts({ ...state, derived })) derived[c.flag] = true

  return { ...state, derived }
}

/** الأسئلة المحتسَبة في الميزانية — التوضيحات خارجها عمدًا (`bank/clarify.ts`). */
export function countedAsked(state: PersonalizationState): number {
  return state.history.filter((h) => {
    if (h.answeredAt === null && !h.skipped) return false
    return QUESTION_BY_ID[h.id]?.category !== 'clarify'
  }).length
}

// ————————————————————————— الأهلية —————————————————————————

/** هل هذا السؤال معروض لهذا المستخدم الآن؟ */
export function isEligible(qd: QuestionDef, state: PersonalizationState): boolean {
  if (qd.levels) {
    const klass = state.derived.experienceClass as ExperienceClass | undefined
    if (klass && !qd.levels.includes(klass)) return false
  }
  if (!evaluate(qd.eligible, state)) return false
  if (qd.skipIf && evaluate(qd.skipIf, state)) return false
  return true
}

/** الخيارات المعروضة فعلًا — الخيار غير المؤهَّل **لا يُبنى**، لا يُخفى. */
export function visibleOptions(qd: QuestionDef, state: PersonalizationState): NonNullable<QuestionDef['options']> {
  return (qd.options ?? []).filter((o) => evaluate(o.when, state))
}

function isAnsweredKey(state: PersonalizationState, key: string): boolean {
  const v = state.answers[key]
  if (v === undefined || v === null) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'string') return v.length > 0
  return true
}

function wasTouched(state: PersonalizationState, id: QuestionId): boolean {
  return state.history.some((h) => h.id === id && (h.answeredAt !== null || h.skipped))
}

// ————————————————————————— الاختيار —————————————————————————

export type StopReason = 'consent_pending' | 'complete' | 'cap_reached' | 'exhausted'

export interface Selection {
  question: QuestionDef | null
  /** سبب التوقّف حين `question === null`. */
  reason: StopReason | null
  /** خارج الميزانية (توضيح تناقض). */
  offBudget: boolean
}

function budgetFor(state: PersonalizationState, cfg: EngineConfig): FlowBudget {
  const klass = (state.derived.experienceClass as ExperienceClass) ?? 'complete_beginner'
  const b = cfg.budget[klass] ?? cfg.budget.complete_beginner
  // السقف المطلق يغلب أي تهيئة — شرط سلامة العدّاد لا يُخترق بتهيئة.
  return { ...b, max: Math.min(b.max, ABSOLUTE_QUESTION_CAP), hardCap: Math.min(b.hardCap, ABSOLUTE_QUESTION_CAP) }
}

function pending(state: PersonalizationState): QuestionDef[] {
  return QUESTION_BANK.filter((qd) => !wasTouched(state, qd.id) && !isAnsweredKey(state, qd.key) && isEligible(qd, state))
}

function byRank(a: QuestionDef, b: QuestionDef): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  if (a.infoGain !== b.infoGain) return b.infoGain - a.infoGain
  return a.id.localeCompare(b.id) // فاصل حتمي — نفس المدخل نفس المخرج دائمًا
}

/** يختار السؤال التالي. نقيّ: لا يكتب في الحالة ولا يقرأ تخزينًا. */
export function selectNext(state: PersonalizationState, cfg: EngineConfig = DEFAULT_CONFIG): Selection {
  // (0) بوابة الموافقة — قبل كل شيء بلا استثناء.
  if (state.answers.healthConsent !== true) {
    const consent = getQuestion(CONSENT_QUESTION_ID)
    if (consent && !wasTouched(state, CONSENT_QUESTION_ID)) {
      return { question: consent, reason: null, offBudget: true }
    }
    // سُئل ولم يوافق ⇒ التدفّق يقف. لا سؤال جامع للبيانات يُطرح بلا إذن،
    // ولا يُعاد السؤال في حلقة — القرار للمستخدم والواجهة تعرض مخرجًا.
    return { question: null, reason: 'consent_pending', offBudget: false }
  }

  const ready = pending(state)

  // (1) توضيح تناقض — خارج الميزانية، ويسبق كل شيء بعد الموافقة.
  const conflicts = unresolvedConflicts(state)
  for (const c of conflicts) {
    const qd = ready.find((x) => x.id === c.clarify)
    if (qd) return { question: qd, reason: null, offBudget: true }
  }

  const budget = budgetFor(state, cfg)
  const asked = countedAsked(state)

  // (2) إلزامي ناقص — يُطرح حتى لو تجاوزنا الحدّ الأقصى الناعم، ويقف عند السقف
  //     المطلق وحده. خطة بلا عدد أيام ليست خطة.
  const required = ready.filter((x) => x.required).sort(byRank)
  if (required.length && asked < budget.hardCap) {
    return { question: required[0], reason: null, offBudget: false }
  }

  if (asked >= budget.hardCap) return { question: null, reason: 'cap_reached', offBudget: false }
  if (asked >= budget.max) return { question: null, reason: 'complete', offBudget: false }

  // (3) طابور المتابعات — ما فتحته إجابة سابقة يسبق البنك العام.
  for (const id of state.queue) {
    const qd = ready.find((x) => x.id === id)
    if (qd) return { question: qd, reason: null, offBudget: false }
  }

  // (4) الباقي بالترتيب. وإن نفد المؤهَّل قبل الحدّ الأدنى ⇒ `exhausted` لا حشو.
  const rest = ready.filter((x) => x.category !== 'clarify').sort(byRank)
  if (!rest.length) return { question: null, reason: 'exhausted', offBudget: false }
  if (asked >= budget.min && !required.length) {
    // بلغنا الحدّ الأدنى والإلزامي مكتمل: نستمرّ فقط بما مكسبه معتبَر.
    const worthwhile = rest.filter((x) => x.infoGain >= 5)
    if (!worthwhile.length) return { question: null, reason: 'complete', offBudget: false }
    return { question: worthwhile[0], reason: null, offBudget: false }
  }
  return { question: rest[0], reason: null, offBudget: false }
}

export function isComplete(state: PersonalizationState, cfg: EngineConfig = DEFAULT_CONFIG): boolean {
  return selectNext(state, cfg).question === null && state.answers.healthConsent === true
}

/** تقدّم 0..1 — تقديري ومعلَن كذلك، لا وعد بعدد نهائي. */
export function progress(state: PersonalizationState, cfg: EngineConfig = DEFAULT_CONFIG): number {
  const budget = budgetFor(state, cfg)
  const asked = countedAsked(state)
  return Math.max(0, Math.min(1, asked / Math.max(1, budget.min)))
}

// ————————————————————————— تطبيق الإجابة —————————————————————————

export interface ApplyResult {
  state: PersonalizationState
  /** رُفعت متابعات جديدة؟ */
  queued: QuestionId[]
  /** رُفض الإدخال؟ (خيار غير معروض، أو خارج المدى) */
  rejected: string | null
}

function validate(qd: QuestionDef, value: AnswerValue, state: PersonalizationState): string | null {
  if (value === null) return qd.skippable ? null : 'required'
  if (qd.range && typeof value === 'number') {
    if (!Number.isFinite(value)) return 'not_a_number'
    if (value < qd.range.min || value > qd.range.max) return 'out_of_range'
  }
  if (qd.options?.length) {
    const allowed = new Set(visibleOptions(qd, state).map((o) => o.value))
    const picked = Array.isArray(value) ? (value as string[]) : typeof value === 'string' ? [value] : []
    // خيار غير معروض يُرفض بالاسم. هذا هو حاجز القاصرين عند حدّ البيانات لا
    // عند حدّ الواجهة: `cut` مُرسَلًا يدويًا لعمر ١٦ يُرفض هنا.
    for (const p of picked) if (!allowed.has(p)) return `option_not_available:${p}`
  }
  if (qd.select?.min && Array.isArray(value) && value.length < qd.select.min) return 'too_few'
  if (qd.select?.max && Array.isArray(value) && value.length > qd.select.max) return 'too_many'
  return null
}

/**
 * يسجّل إجابة ويعيد حالة جديدة. **لا يطفر**: الرفض يعود في `rejected` والحالة
 * تبقى كما هي — الواجهة تعرض الخطأ ولا تفقد شيئًا.
 */
export function applyAnswer(
  state: PersonalizationState,
  id: QuestionId,
  value: AnswerValue,
  cfg: EngineConfig = DEFAULT_CONFIG,
): ApplyResult {
  const qd = getQuestion(id)
  if (!qd) return { state, queued: [], rejected: 'unknown_question' }

  const invalid = validate(qd, value, state)
  if (invalid) return { state, queued: [], rejected: invalid }

  const now = cfg.now()
  const answers = { ...state.answers, [qd.key]: value }
  const derivedSets: Record<string, string | number | boolean> = { ...state.derived }

  // أثر الخيار المباشر (`sets`) — يُكتب قبل أي اشتقاق.
  for (const opt of qd.options ?? []) {
    const picked = Array.isArray(value) ? (value as string[]).includes(opt.value) : value === opt.value
    if (picked && opt.sets) Object.assign(derivedSets, opt.sets)
  }

  const prior = state.history.find((h) => h.id === id)
  const history = prior
    ? state.history.map((h) => (h.id === id ? { ...h, answeredAt: now, skipped: false, revisions: h.revisions + 1 } : h))
    : [...state.history, { id, askedAt: now, answeredAt: now, skipped: false, revisions: 0 }]

  let next: PersonalizationState = { ...state, answers, derived: derivedSets, history, updatedAt: now }

  // تسجيل حلّ التناقض إن كان هذا سؤال توضيح.
  if (qd.category === 'clarify') {
    const conflictId = CLARIFY_TO_CONFLICT[qd.id]
    if (conflictId) {
      next = {
        ...next,
        clarifications: [...next.clarifications, { conflictId, questionId: qd.id, resolvedAt: now }],
      }
    }
  }

  next = recomputeDerived(next)

  // المتابعات — تُرفع بعد الاشتقاق حتى تُقيَّم شروطها على الحالة الجديدة.
  const queued: QuestionId[] = []
  for (const rule of qd.followUps ?? []) {
    if (!evaluate(rule.when, next)) continue
    for (const target of rule.ask) {
      if (next.queue.includes(target) || wasTouched(next, target)) continue
      queued.push(target)
    }
  }
  if (queued.length) next = { ...next, queue: [...next.queue, ...queued] }

  return { state: next, queued, rejected: null }
}

/** خريطة سؤال التوضيح ← التناقض الذي يحلّه. مبنيّة من `CONFLICTS` لا مكرّرة. */
const CLARIFY_TO_CONFLICT: Record<string, string> = {
  'c-level-mismatch': 'level',
  'c-equipment-mismatch': 'equipment',
  'c-days-split-mismatch': 'days_split',
  'c-limitation-mismatch': 'limitation',
  'c-goal-pace-mismatch': 'goal_pace',
  'c-progression-mismatch': 'progression',
  'c-time-volume-mismatch': 'time_volume',
  'c-cardio-mismatch': 'cardio',
}

/** تخطّي سؤال قابل للتخطّي. غير القابل يُرفض بالاسم لا بالصمت. */
export function skipQuestion(state: PersonalizationState, id: QuestionId, cfg: EngineConfig = DEFAULT_CONFIG): ApplyResult {
  const qd = getQuestion(id)
  if (!qd) return { state, queued: [], rejected: 'unknown_question' }
  if (!qd.skippable) return { state, queued: [], rejected: 'not_skippable' }
  const now = cfg.now()
  const prior = state.history.find((h) => h.id === id)
  const history = prior
    ? state.history.map((h) => (h.id === id ? { ...h, skipped: true, answeredAt: null } : h))
    : [...state.history, { id, askedAt: now, answeredAt: null, skipped: true, revisions: 0 }]
  return { state: recomputeDerived({ ...state, history, updatedAt: now }), queued: [], rejected: null }
}

/**
 * الرجوع وتغيير إجابة سابقة (§16). **لا يُعيد التشغيل**: الإجابة تُحدَّث،
 * والمشتقّات تُعاد، والإجابات التي صارت غير مؤهَّلة **تُنظَّف** حتى لا يبقى
 * جواب يتيم يقود قرارًا لم يعد ممكنًا (كخطّة معدّات لناد صار منزلًا).
 */
export function reviseAnswer(
  state: PersonalizationState,
  id: QuestionId,
  value: AnswerValue,
  cfg: EngineConfig = DEFAULT_CONFIG,
): ApplyResult {
  const result = applyAnswer(state, id, value, cfg)
  if (result.rejected) return result
  return { ...result, state: pruneOrphans(result.state) }
}

/** يحذف إجابات صارت خارج الأهلية بعد تغيير سابق عليها. */
export function pruneOrphans(state: PersonalizationState): PersonalizationState {
  let changed = false
  const answers = { ...state.answers }
  let history = state.history
  for (const qd of QUESTION_BANK) {
    if (answers[qd.key] === undefined) continue
    if (isEligible(qd, state)) continue
    delete answers[qd.key]
    history = history.filter((h) => h.id !== qd.id)
    changed = true
  }
  if (!changed) return state
  // شوط واحد قد يفتح شوطًا آخر (إجابة كانت تحمي إجابة). نكرّر حتى الاستقرار.
  return pruneOrphans(recomputeDerived({ ...state, answers, history }))
}

/** يختم التخصيص بوقت الإكمال. */
export function markComplete(state: PersonalizationState, cfg: EngineConfig = DEFAULT_CONFIG): PersonalizationState {
  return { ...state, completedAt: cfg.now(), updatedAt: cfg.now() }
}
