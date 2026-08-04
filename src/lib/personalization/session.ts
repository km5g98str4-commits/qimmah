// واجهة الجلسة — نقطة التماس الوحيدة بين المحرّك وطبقة العرض.
//
// ═══ حدّ المسؤولية ═══
// الواجهة البصرية مسؤولية أخرى (Codex). ما يلزمها منّا محدَّد في §16 من
// المواصفة، وهو ما تعطيه `viewModel()` **جاهزًا مترجَمًا**: نصّ السؤال،
// الخيارات المعروضة فعلًا، التقدّم، هل يُتخطّى، رسالة التحقّق، الفعل التالي.
//
// **ولا مكوّن React هنا.** هذا الملف منطق صرف — لأن ربطه بمكوّن كان سيجعل
// تعديل الواجهة يمرّ على المحرّك، وهو بالضبط التداخل الذي يمنعه فصل الحارات.
//
// ═══ الصدق في الحفظ (الميثاق §5) ═══
// `answer()` **يكتب ثم يفحص**: فشل الكتابة يعود في `saveResult` ولا يُبتلع،
// والحالة في الذاكرة تبقى كما هي فلا يضيع جواب. لا شاشة نجاح قبل تأكيد الكتابة.

import { personalizationStrings, type PersonalizationStrings, type QuestionText } from '@/i18n/dict/personalization'
import { applyAnswer, createState, isComplete, markComplete, progress, reviseAnswer, selectNext, skipQuestion, visibleOptions, countedAsked, DEFAULT_CONFIG, type EngineConfig, type StopReason } from './engine'
import { deriveProfile, type DerivedProfileResult } from './profile'
import { loadState, saveProfile, saveState } from './persistence'
import { emit, questionProps } from './analytics'
import { unresolvedConflicts } from './contradictions'
import { ABSOLUTE_QUESTION_CAP, type AnswerValue, type PersonalizationState, type QuestionDef, type QuestionId } from './types'
import type { Lang } from '@/lib/appPreferences'
import type { WriteResult } from '@/lib/safeStorage'

export interface OptionView {
  value: string
  label: string
}

export interface QuestionViewModel {
  id: QuestionId
  category: QuestionDef['category']
  answerType: QuestionDef['answer']
  title: string
  hint?: string
  /** كتلة قانونية مفصولة بصريًا — تُعرض في صندوق مستقلّ لا داخل نبرة الشاشة. */
  legal?: string
  options: OptionView[]
  range?: QuestionDef['range']
  select?: QuestionDef['select']
  canSkip: boolean
  required: boolean
  /** 0..1 — تقديري ومعلَن كذلك. */
  progress: number
  askedCount: number
  /** الحدّ الأقصى المطلق — تعرضه الواجهة «تقريبًا x من y». */
  cap: number
  /** هذا السؤال توضيح تناقض؟ الواجهة تقدّم له مقدّمة مختلفة. */
  isClarification: boolean
  /** هل يمكن الرجوع؟ */
  canGoBack: boolean
}

export interface SessionSnapshot {
  state: PersonalizationState
  view: QuestionViewModel | null
  /** سبب انتهاء التدفّق حين `view === null`. */
  stop: StopReason | null
  strings: PersonalizationStrings
}

export interface AnswerOutcome extends SessionSnapshot {
  /** مفتاح رسالة التحقّق حين تُرفض الإجابة — الحالة لم تتغيّر. */
  error: string | null
  /** نتيجة الكتابة على القرص — **تُقرأ ولا تُتجاهل**. */
  saveResult: WriteResult | null
}

function textFor(strings: PersonalizationStrings, id: QuestionId): QuestionText {
  // سؤال بلا نصّ خطأ تأليف لا حالة تشغيل — الإثبات يمنعه، وهنا نعيد المعرّف
  // ظاهرًا حتى يُكتشف بالعين فورًا بدل أن يُعرض فراغ صامت.
  return strings.questions[id] ?? { title: id }
}

function buildView(state: PersonalizationState, qd: QuestionDef, offBudget: boolean, cfg: EngineConfig): QuestionViewModel {
  const strings = personalizationStrings[state.lang]
  const text = textFor(strings, qd.id)
  const options = visibleOptions(qd, state).map((o) => ({
    value: o.value,
    label: text.opts?.[o.value] ?? o.value,
  }))
  return {
    id: qd.id,
    category: qd.category,
    answerType: qd.answer,
    title: text.title,
    hint: text.hint,
    legal: text.legal,
    options,
    range: qd.range,
    select: qd.select,
    canSkip: qd.skippable,
    required: qd.required,
    progress: progress(state, cfg),
    askedCount: countedAsked(state),
    cap: ABSOLUTE_QUESTION_CAP,
    isClarification: offBudget && qd.category === 'clarify',
    canGoBack: state.history.some((h) => h.answeredAt !== null),
  }
}

function snapshot(state: PersonalizationState, cfg: EngineConfig): SessionSnapshot {
  const sel = selectNext(state, cfg)
  return {
    state,
    view: sel.question ? buildView(state, sel.question, sel.offBudget, cfg) : null,
    stop: sel.reason,
    strings: personalizationStrings[state.lang],
  }
}

// ————————————————————————— دورة الحياة —————————————————————————

/** يبدأ جلسة جديدة، أو **يستأنف** محفوظة إن وُجدت وصلحت. */
export function startSession(lang: Lang, userId: string | null = null, cfg: EngineConfig = DEFAULT_CONFIG): SessionSnapshot {
  const resumed = loadState(userId)
  if (resumed) {
    emit('personalization_resumed', { asked: countedAsked(resumed) }, cfg.now())
    return snapshot(resumed, cfg)
  }
  const fresh = createState(lang, userId, cfg.now())
  emit('personalization_started', { lang }, cfg.now())
  const snap = snapshot(fresh, cfg)
  if (snap.view) emit('personalization_question_shown', questionProps(snap.view.id, snap.view.category), cfg.now())
  return snap
}

/**
 * يسجّل إجابة. الترتيب مقصود: **تحقّق ← تطبيق ← كتابة ← فحص**. ولا تُعلن
 * الواجهة تقدّمًا قبل أن تقرأ `saveResult`.
 */
export function answer(
  state: PersonalizationState,
  id: QuestionId,
  value: AnswerValue,
  cfg: EngineConfig = DEFAULT_CONFIG,
): AnswerOutcome {
  const qd = selectNext(state, cfg).question
  const result = applyAnswer(state, id, value, cfg)
  if (result.rejected) {
    emit('personalization_validation_failed', { question: id, error: result.rejected }, cfg.now())
    return { ...snapshot(state, cfg), error: result.rejected, saveResult: null }
  }

  const saveResult = saveState(result.state)
  emit('personalization_question_answered', questionProps(id, qd?.category ?? 'basics', value), cfg.now())

  const snap = snapshot(result.state, cfg)
  if (snap.view) emit('personalization_question_shown', questionProps(snap.view.id, snap.view.category), cfg.now())
  return { ...snap, error: null, saveResult }
}

export function skip(state: PersonalizationState, id: QuestionId, cfg: EngineConfig = DEFAULT_CONFIG): AnswerOutcome {
  const result = skipQuestion(state, id, cfg)
  if (result.rejected) return { ...snapshot(state, cfg), error: result.rejected, saveResult: null }
  const saveResult = saveState(result.state)
  emit('personalization_question_skipped', { question: id }, cfg.now())
  return { ...snapshot(result.state, cfg), error: null, saveResult }
}

/** تغيير إجابة سابقة — يمسح ما صار يتيمًا ولا يعيد تشغيل التدفّق. */
export function revise(
  state: PersonalizationState,
  id: QuestionId,
  value: AnswerValue,
  cfg: EngineConfig = DEFAULT_CONFIG,
): AnswerOutcome {
  const result = reviseAnswer(state, id, value, cfg)
  if (result.rejected) return { ...snapshot(state, cfg), error: result.rejected, saveResult: null }
  const saveResult = saveState(result.state)
  emit('personalization_back', { question: id }, cfg.now())
  return { ...snapshot(result.state, cfg), error: null, saveResult }
}

export interface FinishOutcome {
  profile: DerivedProfileResult['profile']
  assumptions: DerivedProfileResult['assumptions']
  state: PersonalizationState
  saveResult: WriteResult
  /** لم يكتمل بعد؟ الاسم يقول السبب بدل «فشل». */
  blocked: StopReason | null
}

/**
 * يختم التخصيص ويُخرج الملف. **لا يختم قبل اكتمال المسار** — والسبب يعود
 * مسمّى في `blocked` بدل رفض صامت.
 */
export function finish(state: PersonalizationState, cfg: EngineConfig = DEFAULT_CONFIG): FinishOutcome {
  const sel = selectNext(state, cfg)
  if (sel.question) {
    const { profile, assumptions } = deriveProfile(state, cfg.now())
    return { profile, assumptions, state, saveResult: 'ok', blocked: sel.reason ?? 'complete' }
  }
  const done = markComplete(state, cfg)
  const { profile, assumptions } = deriveProfile(done, cfg.now())
  const saveResult = saveProfile(profile)
  saveState(done)
  emit(
    'personalization_completed',
    { asked: countedAsked(done), experience: profile.experience, confidence: profile.confidence },
    cfg.now(),
  )
  return { profile, assumptions, state: done, saveResult, blocked: null }
}

/** تناقضات لم تُحسم بعد — تعرضها الواجهة كمقدّمة لسؤال التوضيح. */
export function pendingConflicts(state: PersonalizationState): string[] {
  return unresolvedConflicts(state).map((c) => c.id)
}

export { isComplete }
