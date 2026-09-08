import { useMemo, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseName } from '@/components/ExerciseName'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { PlanDay, PlanExercise, WorkoutPlan } from '@/types/workout'
import { getExercise } from '@/data/exercises'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import { customPlanStrings } from './strings'
import {
  MAX_DAYS,
  MIN_DAYS,
  addExerciseToDay,
  isPlanSaveable,
  makeEmptyCustomPlan,
  moveExercise,
  removeExerciseFromDay,
  resizeDays,
  totalExercises,
} from './defaults'
import {
  copyDayAs,
  duplicateDay,
  duplicateWeek,
  estimateSessionMinutes,
  seedPlanFromSplit,
  seedRecipeForDayCount,
  validatePlan,
  type PlanResult,
} from './builder'

interface CustomPlanBuilderProps {
  lang: Lang
  /** جدول موجود للتعديل — عند غيابه (أو بلا أيام) يبدأ الباني من الصفر. */
  initialPlan?: WorkoutPlan
  /** يُستدعى بعد اكتمال البناء — الأب يتكفّل بالحفظ لكل حساب والاعتماد. */
  onSave: (plan: WorkoutPlan) => void
  onCancel: () => void
}

// خيارات التكرارات الشائعة (شرطة en-dash مطابقة للجدول المولّد).
// آخر خيار «توقيت» بقيمة محايدة لغويًا (لا تُخزَّن بالعربية) — تُعرض تسميته حسب اللغة.
const REP_SECONDS_VALUE = '30s'
const REP_OPTIONS = ['6–8', '8–10', '8–12', '10–12', '10–15', '12–15', '15–20', '20', REP_SECONDS_VALUE]

type StepKey = 'days' | 'build' | 'review'
const STEPS: StepKey[] = ['days', 'build', 'review']

/**
 * باني الجدول المخصّص (P10 A1) — شاشة كاملة، RTL، بالهوية الداكنة.
 * ثلاث خطوات: عدد الأيام → بناء كل يوم (اسم + تمارين + ترتيب + مجموعات/تكرار) → مراجعة وحفظ.
 */
export function CustomPlanBuilder({ lang, initialPlan, onSave, onCancel }: CustomPlanBuilderProps) {
  const d = customPlanStrings[lang]
  const editing = Boolean(initialPlan && initialPlan.days.length > 0)
  const [plan, setPlan] = useState<WorkoutPlan>(() =>
    editing && initialPlan ? { ...initialPlan, templateId: 'custom' } : makeEmptyCustomPlan(3),
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [activeDay, setActiveDay] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  // H-1: التعبئة اختيار صريح يستدعيه المستخدم (قرار مؤسس مقفل ٣) — لا تعبئة صامتة.
  const [seedChosen, setSeedChosen] = useState(false)
  // H-2: منتقي اليوم الهدف لنسخ اليوم، ورسالة رفض المحرّك (ثنائية اللغة، من عقده).
  const [copyPickerOpen, setCopyPickerOpen] = useState(false)
  const [engineNotice, setEngineNotice] = useState<string | null>(null)

  const step = STEPS[stepIndex]
  const total = STEPS.length
  // [CUSTOM-PLAN-IOS-OVERLAY] سطح ملء الشاشة يعلن الانغماس كما تفعل الجلسة النشطة:
  // القشرة تُزيل رأسها وشريطها السفلي من التخطيط، فلا كروم يعلو الباني ولا يقصّ ذيله.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: true }))
    return () => { window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: false })) }
  }, [])
  const saveable = isPlanSaveable(plan)
  // H-1: وصفة التعبئة تُعرض قبل التطبيق — المستخدم يرى ما سيحدث لكل يوم.
  const seedRecipe = useMemo(() => seedRecipeForDayCount(plan.days.length), [plan.days.length])
  // H-3ب: تحذيرات المحقّق الجاهزة ثنائية اللغة — تحذيرات لا موانع.
  const planWarnings = useMemo(() => validatePlan(plan), [plan])

  // — عمليات على الأيام والتمارين —
  const setDayCount = (count: number) => {
    setPlan((p) => resizeDays(p, count))
    setActiveDay((i) => Math.min(i, count - 1))
  }

  const patchDay = (index: number, fn: (day: PlanDay) => PlanDay) =>
    setPlan((p) => ({ ...p, days: p.days.map((day, i) => (i === index ? fn(day) : day)) }))

  const renameDay = (index: number, value: string) =>
    patchDay(index, (day) => (lang === 'en' ? { ...day, nameEn: value } : { ...day, nameAr: value }))

  const addExercise = (exerciseId: string) => patchDay(activeDay, (day) => addExerciseToDay(day, exerciseId))
  const removeExercise = (peId: string) => patchDay(activeDay, (day) => removeExerciseFromDay(day, peId))
  const shift = (i: number, dir: -1 | 1) => patchDay(activeDay, (day) => moveExercise(day, i, dir))
  const patchExercise = (peId: string, partial: Partial<PlanExercise>) =>
    patchDay(activeDay, (day) => ({
      ...day,
      exercises: day.exercises.map((pe) => (pe.id === peId ? { ...pe, ...partial } : pe)),
    }))

  // H-2: تطبيق نتيجة عملية محرّك — نجاحها يحدّث الخطة، ورفضها يُعرض برسالته الجاهزة.
  const applyEngineResult = (result: PlanResult): boolean => {
    if (result.status === 'ok') {
      setPlan(result.plan)
      setEngineNotice(null)
      return true
    }
    const e = result.errors[0]
    setEngineNotice(lang === 'en' ? e.messageEn : e.messageAr)
    return false
  }

  const duplicateActiveDay = () => {
    if (!day) return
    applyEngineResult(duplicateDay(plan, day.id))
  }
  const copyActiveDayTo = (targetDayId: string) => {
    if (!day) return
    if (applyEngineResult(copyDayAs(plan, day.id, targetDayId))) setCopyPickerOpen(false)
  }
  const duplicateWholeWeek = () => applyEngineResult(duplicateWeek(plan))

  // — تنقّل —
  // [CUSTOM-PLAN-DEADEND-001] يوم فارغ ⇒ فعلٌ يوصله، لا زرٌّ معطَّل.
  const firstEmptyDay = plan.days.findIndex((pd) => pd.exercises.length === 0)
  const canSeedEmpty = seedRecipe.length > 0 && plan.days.some((pd, i) => pd.exercises.length === 0 && seedRecipe[i] !== undefined)
  const goToBuildDay = (i: number) => {
    setActiveDay(Math.max(0, i))
    setStepIndex(STEPS.indexOf('build'))
  }
  const fillEmptyDays = () => {
    if (canSeedEmpty && applyEngineResult(seedPlanFromSplit(plan))) return
    goToBuildDay(firstEmptyDay)
  }
  const goNext = () => {
    if (step === 'review') {
      if (saveable) onSave(plan)
      else fillEmptyDays()
      return
    }
    // H-1: التعبئة تُطبَّق هنا فقط — بعد اختيار المستخدم البطاقة صراحةً في خطوة الأيام.
    if (step === 'days' && seedChosen) {
      const seeded = seedPlanFromSplit(plan)
      if (seeded.status === 'ok') {
        setPlan(seeded.plan)
        setSeedChosen(false) // تطبيق واحد لكل اختيار — الرجوع والتقدّم لا يعيدان التعبئة خلسة.
      }
    }
    setStepIndex((s) => Math.min(total - 1, s + 1))
  }
  const goBack = () => {
    if (stepIndex === 0) return onCancel()
    setStepIndex((s) => Math.max(0, s - 1))
  }

  const nextLabel = step === 'review' ? (saveable ? d.save : canSeedEmpty ? d.fillEmptyDays : d.addExercisesToDay) : d.next

  const day = plan.days[activeDay]
  // H-3ب أثناء البناء: تحذير طول الجلسة لليوم النشط وحده (اليوم الفارغ له حالته المرئية أصلًا).
  const activeDayWarnings = day ? planWarnings.filter((w) => w.subject === day.id && w.code === 'session-too-long') : []

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[70] flex flex-col bg-page text-ink-900">
      {/* رأس — سطح ملء الشاشة يبدأ تحت شريط الحالة، فحشوته العلوية تحترم منطقة الأمان. */}
      <header className="shrink-0 border-b border-line px-5" style={{ paddingTop: 'max(1rem, var(--safe-top))' }}>
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label={d.back}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-900"
          >
            <Icon name={lang === 'ar' ? 'ChevronRight' : 'ChevronLeft'} className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-black text-ink-900">{editing ? d.editTitle : d.createTitle}</span>
            <span className="font-bold text-ink-400">
              {stepIndex + 1}/{total}
            </span>
          </div>
          <div className="h-10 w-10" />
        </div>
        <div className="mx-auto mb-3 mt-3 flex w-full max-w-md items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn('h-1.5 rounded-full', i <= stepIndex ? 'bg-primary' : 'bg-line')} />
            </div>
          ))}
        </div>
      </header>

      {/* المحتوى */}
      <main className="app-scroll flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-md">
          {step === 'days' && (
            <Section title={d.daysTitle} hint={d.daysHint}>
              <DaysStepper value={plan.days.length} onChange={setDayCount} unit={d.daysUnit} lang={lang} />

              {/* H-1: بطاقة التعبئة من التقسيمة — اختيار صريح، والوصفة تُعرض تحتها قبل التطبيق */}
              <button
                type="button"
                onClick={() => setSeedChosen((v) => !v)}
                aria-pressed={seedChosen}
                className={cn(
                  'mt-4 w-full rounded-2xl border p-4 text-start transition-colors',
                  seedChosen ? 'border-primary bg-primary-soft' : 'border-dashed border-line bg-surface',
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                    <Icon name="Sparkles" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-ink-900">{d.seedCardTitle}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">{d.seedCardHint}</span>
                  </span>
                  <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-md border',
                      seedChosen ? 'border-primary bg-primary text-white' : 'border-line bg-beige text-transparent',
                    )}
                  >
                    <Icon name="Check" className="h-4 w-4" />
                  </span>
                </span>
                {seedChosen && (
                  <span className="mt-2 block text-xs font-bold text-primary-c">{d.seedSelectedNote}</span>
                )}
              </button>

              <ul className="mt-6 space-y-2">
                {plan.days.map((pd, i) => {
                  const recipe = seedRecipe[i]
                  const willSeed = seedChosen && pd.exercises.length === 0 && recipe !== undefined
                  return (
                    <li
                      key={pd.id}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-black text-primary-c">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">
                        {willSeed ? (lang === 'en' ? recipe.nameEn : recipe.nameAr) : lang === 'en' ? pd.nameEn : pd.nameAr}
                      </span>
                      {willSeed && (
                        <span className="shrink-0 text-[11px] font-bold text-primary-c">
                          {recipe.exerciseIds.length} {d.exercisesUnit}
                        </span>
                      )}
                      {pd.exercises.length > 0 && (
                        <span className="shrink-0 text-[11px] font-bold text-ink-400">
                          {pd.exercises.length} {d.exercisesUnit}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}

          {step === 'build' && day && (
            <Section title={d.buildTitle} hint={d.buildHint}>
              {/* تبويبات الأيام */}
              <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
                {plan.days.map((pd, i) => (
                  <button
                    key={pd.id}
                    type="button"
                    onClick={() => setActiveDay(i)}
                    aria-pressed={i === activeDay}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors',
                      i === activeDay
                        ? 'border-primary-soft bg-primary text-white'
                        : 'border-line bg-surface text-ink-700 hover:text-ink-900',
                    )}
                  >
                    <span>{d.dayTab} {i + 1}</span>
                    {pd.exercises.length > 0 && (
                      <span
                        className={cn(
                          'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-black',
                          i === activeDay ? 'bg-white/25 text-white' : 'bg-primary-soft text-primary-c',
                        )}
                      >
                        {pd.exercises.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* H-2: عمليات المحرّك على اليوم النشط + H-3أ: شارة الدقائق الحيّة */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={duplicateActiveDay}
                  disabled={day.exercises.length === 0 || plan.days.length >= MAX_DAYS}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink-700 disabled:opacity-30"
                >
                  <Icon name="Repeat" className="h-4 w-4" />
                  {d.duplicateDayAction}
                </button>
                <button
                  type="button"
                  onClick={() => setCopyPickerOpen((v) => !v)}
                  disabled={day.exercises.length === 0 || plan.days.length < 2}
                  aria-expanded={copyPickerOpen}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink-700 disabled:opacity-30"
                >
                  <Icon name="Layers" className="h-4 w-4" />
                  {d.copyDayAction}
                </button>
                {(plan.days.length === 2 || plan.days.length === 3) && (
                  <button
                    type="button"
                    onClick={duplicateWholeWeek}
                    disabled={!saveable}
                    title={d.duplicateWeekHint}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink-700 disabled:opacity-30"
                  >
                    <Icon name="CalendarDays" className="h-4 w-4" />
                    {d.duplicateWeekAction}
                  </button>
                )}
                {day.exercises.length > 0 && (
                  <span className="ms-auto flex items-center gap-1 text-[11px] font-bold text-ink-500">
                    <Icon name="Clock" className="h-3.5 w-3.5" />
                    ~{estimateSessionMinutes(day)} {d.minutesUnit}
                  </span>
                )}
              </div>

              {copyPickerOpen && (
                <div className="mb-4 rounded-xl border border-line bg-surface p-3">
                  <p className="text-xs font-bold text-ink-900">{d.copyDayTargetTitle}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{d.copyDayReplaceHint}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plan.days.map((pd, i) =>
                      i === activeDay ? null : (
                        <button
                          key={pd.id}
                          type="button"
                          onClick={() => copyActiveDayTo(pd.id)}
                          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-beige px-3 py-2 text-xs font-bold text-ink-700"
                        >
                          <span>{d.dayTab} {i + 1}</span>
                          <span className="truncate text-ink-400">{lang === 'en' ? pd.nameEn : pd.nameAr}</span>
                          {pd.exercises.length > 0 && (
                            <span className="text-ink-400">({pd.exercises.length})</span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {engineNotice && (
                <p className="mb-4 flex items-center gap-1.5 text-xs font-bold text-danger">
                  <Icon name="AlertTriangle" className="h-4 w-4 shrink-0" />
                  {engineNotice}
                </p>
              )}

              {/* اسم اليوم */}
              <label className="mb-1.5 block text-xs font-bold text-ink-500">{d.dayNameLabel}</label>
              <input
                value={lang === 'en' ? day.nameEn : day.nameAr}
                onChange={(e) => renameDay(activeDay, e.target.value)}
                placeholder={d.dayNamePlaceholder}
                maxLength={40}
                aria-label={d.dayNameLabel}
                className="mb-5 w-full rounded-xl border border-line bg-beige px-4 py-3 text-base font-bold text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:border-primary focus:outline-none"
              />

              {/* تمارين اليوم */}
              {day.exercises.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary-c">
                    <Icon name="Dumbbell" className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-ink-900">{d.emptyDayTitle}</p>
                  <p className="mt-1 text-xs text-ink-400">{d.emptyDayHint}</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {day.exercises.map((pe, i) => (
                    <ExerciseRow
                      key={pe.id}
                      pe={pe}
                      index={i}
                      count={day.exercises.length}
                      lang={lang}
                      d={d}
                      onMove={shift}
                      onRemove={removeExercise}
                      onSets={(sets) => patchExercise(pe.id, { sets })}
                      onReps={(reps) => patchExercise(pe.id, { reps })}
                    />
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-soft bg-primary-soft py-4 text-sm font-black text-primary-c active:scale-[0.99]"
              >
                <Icon name="Plus" className="h-5 w-5" />
                {d.addExercise}
              </button>

              {/* H-3ب: تحذيرات المحقّق الجاهزة لليوم النشط — تحذير لا مانع */}
              {activeDayWarnings.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {activeDayWarnings.map((w) => (
                    <li key={`${w.code}-${w.subject}`} className="flex items-start gap-1.5 text-xs font-bold text-gold-600">
                      <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0" />
                      {lang === 'en' ? w.messageEn : w.messageAr}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {step === 'review' && (
            <Section title={d.reviewTitle} hint={d.reviewHint}>
              {!saveable && (
                <div data-testid="plan-review-empty" className="mb-4 rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-black text-ink-900">
                    <Icon name="AlertTriangle" className="h-4 w-4 shrink-0 text-gold-600" />
                    {d.reviewEmptyTitle}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{d.reviewEmptyBody}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canSeedEmpty && (
                      <button type="button" onClick={fillEmptyDays} data-testid="plan-review-fill" className="btn-primary min-h-[44px] px-4 text-xs">
                        <Icon name="Sparkles" className="h-4 w-4" />
                        {d.fillEmptyDays}
                      </button>
                    )}
                    <button type="button" onClick={() => goToBuildDay(firstEmptyDay)} data-testid="plan-review-add" className="btn-ghost min-h-[44px] px-4 text-xs">
                      <Icon name="Plus" className="h-4 w-4" />
                      {d.addExercisesToDay}
                    </button>
                  </div>
                </div>
              )}
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="text-sm font-bold text-ink-500">{d.totalExercises}</span>
                <span className="text-lg font-black text-primary-c">{totalExercises(plan)}</span>
              </div>
              <div className="space-y-3">
                {plan.days.map((pd, i) => (
                  <div key={pd.id} className="card p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-black text-primary-c">
                        {i + 1}
                      </span>
                      <p className="text-sm font-black text-ink-900">{lang === 'en' ? pd.nameEn : pd.nameAr}</p>
                      <span className="ms-auto flex shrink-0 items-center gap-2 text-[11px] font-bold text-ink-400">
                        {/* H-3أ: شارة الدقائق لكل يوم — من المقدِّر المعتمد */}
                        {pd.exercises.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Icon name="Clock" className="h-3.5 w-3.5" />
                            ~{estimateSessionMinutes(pd)} {d.minutesUnit}
                          </span>
                        )}
                        <span>
                          {pd.exercises.length} {d.exercisesUnit}
                        </span>
                      </span>
                    </div>
                    {pd.exercises.length === 0 ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-ink-400">{d.emptyDayTitle}</p>
                        <button type="button" onClick={() => goToBuildDay(i)} data-testid="plan-review-day-add" className="shrink-0 text-xs font-black text-primary-c">
                          {d.addExercisesToDay}
                        </button>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {pd.exercises.map((pe) => {
                          const ex = getExercise(pe.exerciseId)
                          return (
                            <li key={pe.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-bold text-ink-700">
                                {lang === 'en' ? ex?.nameEn || ex?.nameAr : ex?.nameAr || ex?.nameEn}
                              </span>
                              <span className="shrink-0 font-bold text-ink-400">
                                {pe.sets}×{pe.reps}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* H-3ب: كل تحذيرات validatePlan الجاهزة ثنائية اللغة — تحذيرات لا موانع */}
              {planWarnings.length > 0 && (
                <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
                  <p className="flex items-center gap-1.5 text-sm font-black text-ink-900">
                    <Icon name="AlertTriangle" className="h-4 w-4 shrink-0 text-gold-600" />
                    {d.warningsTitle}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {planWarnings.map((w) => (
                      <li key={`${w.code}-${w.subject}`} className="text-xs text-ink-700">
                        {lang === 'en' ? w.messageEn : w.messageAr}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!saveable && (
                <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-ink-700">
                  <Icon name="AlertTriangle" className="h-4 w-4 shrink-0 text-gold-600" />
                  {d.reviewEmptyWarning}
                </p>
              )}
            </Section>
          )}
        </div>
      </main>

      {/* شريط الإجراء السفلي */}
      <footer className="shrink-0 border-t border-line bg-page/90 px-5 py-4 backdrop-blur" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="rounded-2xl border border-line bg-surface px-5 py-4 text-base font-bold text-ink-700"
          >
            {stepIndex === 0 ? d.cancel : d.back}
          </button>
          <button
            type="button"
            onClick={goNext}
            data-testid="plan-builder-primary"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black text-white"
          >
            {step === 'review' && <Icon name={saveable ? 'Save' : canSeedEmpty ? 'Sparkles' : 'Plus'} className="h-5 w-5" />}
            {nextLabel}
            {step !== 'review' && <Icon name={lang === 'ar' ? 'ChevronLeft' : 'ChevronRight'} className="h-5 w-5" />}
          </button>
        </div>
      </footer>

      {pickerOpen && <ExercisePickerSheet lang={lang} onAdd={addExercise} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}

// — مكوّنات فرعية —

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-black leading-tight text-ink-900">{title}</h2>
      {hint && <p className="mt-2 text-sm text-ink-500">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function DaysStepper({
  value,
  onChange,
  unit,
  lang,
}: {
  value: number
  onChange: (v: number) => void
  unit: string
  lang: Lang
}) {
  const dec = customPlanStrings[lang]
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(MIN_DAYS, value - 1))}
        disabled={value <= MIN_DAYS}
        aria-label={dec.decrease}
        className="grid h-14 w-14 place-items-center rounded-xl bg-beige text-ink-900 disabled:opacity-30"
      >
        <Icon name="Minus" className="h-6 w-6" />
      </button>
      <div className="text-center">
        <p className="text-4xl font-black text-ink-900">{value}</p>
        <p className="text-xs text-ink-400">{unit}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_DAYS, value + 1))}
        disabled={value >= MAX_DAYS}
        aria-label={dec.increase}
        className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-white disabled:opacity-30"
      >
        <Icon name="Plus" className="h-6 w-6" />
      </button>
    </div>
  )
}

function ExerciseRow({
  pe,
  index,
  count,
  lang,
  d,
  onMove,
  onRemove,
  onSets,
  onReps,
}: {
  pe: PlanExercise
  index: number
  count: number
  lang: Lang
  d: (typeof customPlanStrings)[Lang]
  onMove: (index: number, dir: -1 | 1) => void
  onRemove: (peId: string) => void
  onSets: (sets: number) => void
  onReps: (reps: string) => void
}) {
  const ex = getExercise(pe.exerciseId)
  // توحيد القيمة القديمة «30 ث» إلى الرمز المحايد كي لا يظهر خياران متطابقان في العربية.
  const reps = pe.reps === '30 ث' ? REP_SECONDS_VALUE : pe.reps
  const repOptions = REP_OPTIONS.includes(reps) ? REP_OPTIONS : [reps, ...REP_OPTIONS]
  return (
    <li className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line">
          <ExerciseMedia exerciseId={pe.exerciseId} lang={lang} heightClass="h-12" hideChips variant="thumb" />
        </div>
        <div className="min-w-0 flex-1">
          <ExerciseName
            nameAr={ex?.nameAr || ''}
            nameEn={ex?.nameEn || ''}
            lang={lang}
            className="truncate text-sm font-bold text-ink-900"
            secondaryClassName="truncate text-[11px] text-ink-500"
          />
        </div>
        {/* ترتيب + حذف */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label={d.moveUp}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-beige text-ink-700 disabled:opacity-25"
          >
            <Icon name="ChevronUp" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === count - 1}
            aria-label={d.moveDown}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-beige text-ink-700 disabled:opacity-25"
          >
            <Icon name="ChevronDown" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(pe.id)}
            aria-label={d.removeExercise}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-beige text-danger"
          >
            <Icon name="Trash2" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* مجموعات × تكرار */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-line bg-beige px-2 py-1.5">
          <span className="ps-1 text-[11px] font-bold text-ink-500">{d.setsLabel}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSets(Math.max(1, pe.sets - 1))}
              disabled={pe.sets <= 1}
              aria-label={d.decrease}
              className="grid h-11 w-11 place-items-center rounded-lg bg-surface text-ink-900 disabled:opacity-30"
            >
              <Icon name="Minus" className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-black text-ink-900">{pe.sets}</span>
            <button
              type="button"
              onClick={() => onSets(Math.min(8, pe.sets + 1))}
              disabled={pe.sets >= 8}
              aria-label={d.increase}
              className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-white disabled:opacity-30"
            >
              <Icon name="Plus" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* H-5: وصفة التكرارات بنقرة واحدة — صفّ رقاقات بدل القائمة المنسدلة */}
        <div className="rounded-xl border border-line bg-beige px-2 py-1.5">
          <span className="ps-1 text-[11px] font-bold text-ink-500">{d.repsLabel}</span>
          <div className="-mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={d.repsLabel}>
            {repOptions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onReps(r)}
                aria-pressed={r === reps}
                className={cn(
                  'min-h-[44px] shrink-0 rounded-lg border px-3 py-2 text-xs font-black transition-colors',
                  r === reps
                    ? 'border-primary-soft bg-primary text-white'
                    : 'border-line bg-surface text-ink-700 hover:text-ink-900',
                )}
              >
                {r === REP_SECONDS_VALUE ? d.repsSecondsOption : r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </li>
  )
}
