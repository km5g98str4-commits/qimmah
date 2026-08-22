import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { NumericInput } from '@/components/NumericInput'
import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { playHaptic } from '@/lib/nativeFeedback'
import { stepsManualStrings } from '@/i18n/dict/stepsManual'
import {
  DEFAULT_STEP_GOAL,
  getStepSource,
  getSteps,
  loadStepGoal,
  stepEntryMode,
  STEPS_UPDATED_EVENT,
  writeStepGoal,
  writeSteps,
  type StepWriteResult,
} from '@/lib/stepCounter'
import type { WriteResult } from '@/lib/safeStorage'

/**
 * خطوات اليوم على الرئيسية — [R4-UX-STEPS].
 *
 * ═══ لماذا بطاقة إدخال لا بطاقة عرض ═══
 * الخطوات كانت **قابلة للقراءة في ثلاثة أسطح ولا تُكتب في الرئيسية إطلاقًا**:
 * `StepsView` تعرض ثم تحيل إلى الإعدادات، و«حدّث من Apple Health» زرٌّ لا يفعل
 * شيئًا في المتصفّح لأن القارئ plugin أصلي غير موجود هنا. فمن يفتح الرئيسية على
 * الويب لا يملك طريقًا واحدًا لإدخال رقمه. هذه البطاقة هي ذلك الطريق.
 *
 * ═══ الصدق قبل الطمأنينة (§5 · §6-٤) ═══
 * لا سطر واحد هنا يقول «نتتبّع خطواتك». السطر التوضيحي يأتي من
 * `stepEntryMode()`: على الويب «الرقم اللي تكتبه هو مصدرنا الوحيد»، وداخل
 * الغلاف الأصلي «لو ربطت Apple Health **يوصلنا** مجموع يومك» — «لو» لا «سوف».
 *
 * ═══ الكتابة تُفصح عن فشلها ═══
 * `writeSteps`/`writeStepGoal` تُرجعان `WriteResult` لا رقمًا وحده. فعند فشل
 * التخزين: **لا شاشة نجاح، ولا إغلاق للمحرّر، ولا مسح للمُدخَل** — الرقم يبقى
 * في الخانة والرسالة تسمّي السبب.
 *
 * ═══ الأرقام ═══
 * كل رقم معروض يمرّ بـ`formatNumber(value, lang)` — والإدخال يمرّ بـ
 * `NumericInput` (`type="text"` + `inputMode`) لأن `type="number"` **يُفرِّغ
 * الأرقام العربية قبل أن تصل React**.
 */
export function StepsCard({ lang, onOpenDetail }: { lang: Lang; onOpenDetail?: () => void }) {
  const ar = lang !== 'en'
  const d = stepsManualStrings[lang]
  const n = (value: number) => formatNumber(value, lang)

  const [steps, setSteps] = useState(0)
  const [goal, setGoal] = useState(DEFAULT_STEP_GOAL)
  const [source, setSource] = useState<ReturnType<typeof getStepSource>>('manual')
  const [editing, setEditing] = useState(false)
  const [stepsDraft, setStepsDraft] = useState(0)
  const [goalDraft, setGoalDraft] = useState(DEFAULT_STEP_GOAL)
  const [failure, setFailure] = useState<WriteResult | null>(null)
  const [savedAt, setSavedAt] = useState(0)

  // مصدر واحد للقراءة، ومستمع واحد للحدث — أي كاتب آخر (شاشة الخطوات، الجسر
  // الأصلي) يُحدّث هذه البطاقة بلا إعادة تركيب.
  const reload = useCallback(() => {
    setSteps(getSteps())
    setGoal(loadStepGoal())
    setSource(getStepSource())
  }, [])

  useEffect(() => {
    reload()
    if (typeof window === 'undefined') return
    window.addEventListener(STEPS_UPDATED_EVENT, reload)
    return () => window.removeEventListener(STEPS_UPDATED_EVENT, reload)
  }, [reload])

  const logged = steps > 0
  const pct = goal > 0 ? Math.min(100, Math.round((steps / goal) * 100)) : 0
  const reached = logged && steps >= goal

  const openEditor = () => {
    void playHaptic('selection')
    setStepsDraft(steps)
    setGoalDraft(goal)
    setFailure(null)
    setEditing(true)
  }

  const save = () => {
    // السجلّ أولًا ثم الهدف؛ وفشل **أيّهما** فشلٌ يُقال — لا نصف نجاح صامت.
    const written: StepWriteResult = writeSteps(stepsDraft)
    const goalWritten: StepWriteResult = goalDraft === goal ? { ok: true, reason: 'ok', steps: goal } : writeStepGoal(goalDraft)
    if (!written.ok || !goalWritten.ok) {
      setFailure(written.ok ? goalWritten.reason : written.reason)
      return
    }
    setFailure(null)
    setSavedAt(Date.now())
    setEditing(false)
    reload()
  }

  const failureText =
    failure === 'quota' ? d.saveFailedQuota : failure === 'unavailable' ? d.saveFailedBlocked : failure === null ? null : d.saveFailedGeneric

  return (
    <section
      aria-labelledby="today-steps-title"
      data-testid="today-steps"
      className="rounded-3xl border border-line bg-surface p-3.5 shadow-card"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-700">
          <Icon name="Footprints" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="today-steps-title" className="text-base font-black leading-tight text-ink-900">{d.title}</h2>
          <p className="text-[11px] font-bold leading-snug text-ink-400">{d.eyebrow}</p>
        </div>
        <span dir="ltr" className="shrink-0 text-end">
          <span className="block text-2xl font-black leading-none tracking-tight text-ink-900 tabular-nums">
            {logged ? n(steps) : d.emptyValue}
          </span>
          <span className="mt-0.5 block text-[11px] font-bold leading-none text-ink-500">{d.stepsUnit}</span>
        </span>
      </div>

      {/* شريط التقدّم — الرقم مكتوب بجانبه، فلا معلومة يحملها اللون وحده (§9). */}
      <div className="mt-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={d.progressAria(n(steps), n(goal))}
          className="h-2 overflow-hidden rounded-full bg-beige"
        >
          <span className="block h-full rounded-full bg-[color:var(--c-primary)]" style={{ width: `${pct}%` }} />
        </div>
        <p dir="ltr" className={`mt-1.5 text-xs font-bold tabular-nums text-ink-500 ${ar ? 'text-end' : 'text-start'}`}>
          {logged ? d.ofGoal(n(steps), n(goal)) : d.emptyHint}
        </p>
      </div>

      {reached && (
        <p className="mt-1.5 text-xs font-black text-[color:var(--v2-green-text)]">{d.goalReached}</p>
      )}

      {/* من أين جاء الرقم — قبل أي دعوة لتسجيله، لا بعدها. */}
      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-400">
        {stepEntryMode() === 'manual-only' ? d.sourceWeb : d.sourceNative}
      </p>
      {logged && (
        <p className="mt-1 text-[11px] font-bold text-ink-500">
          {source === 'manual' ? d.writtenByYou : d.writtenByHealth}
        </p>
      )}

      {editing ? (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div>
            <label htmlFor="today-steps-input" className="block text-xs font-bold text-ink-700">{d.stepsFieldLabel}</label>
            <NumericInput
              id="today-steps-input"
              value={stepsDraft}
              onChange={setStepsDraft}
              lang={lang}
              min={0}
              max={200000}
              testId="today-steps-input"
              ariaLabel={d.stepsFieldLabel}
              onEnter={save}
              className="mt-1 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-[color:var(--c-primary)]"
            />
          </div>
          <div>
            <label htmlFor="today-steps-goal" className="block text-xs font-bold text-ink-700">{d.goalFieldLabel}</label>
            <NumericInput
              id="today-steps-goal"
              value={goalDraft}
              onChange={setGoalDraft}
              lang={lang}
              min={1000}
              max={100000}
              testId="today-steps-goal"
              ariaLabel={d.goalFieldLabel}
              onEnter={save}
              className="mt-1 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-[color:var(--c-primary)]"
              hint={<p className="mt-1 text-[11px] text-ink-400">{d.goalOptionalHint}</p>}
            />
          </div>

          {/* فشل الحفظ: رسالة تسمّي السبب، والمحرّر **يبقى مفتوحًا** بمُدخَله. */}
          {failureText && (
            <p role="alert" data-testid="today-steps-error" className="text-xs font-bold leading-relaxed text-danger">
              {failureText}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              data-testid="today-steps-save"
              className="btn-primary tap-target flex-1 px-3 py-2.5 text-sm"
            >
              {d.save}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setFailure(null) }}
              className="btn-ghost tap-target px-3 py-2.5 text-sm"
            >
              {d.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={openEditor}
            data-testid="today-steps-edit"
            className="v2-pressable tap-target flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-page px-3 py-2.5 text-sm font-black text-ink-900"
          >
            <Icon name="Edit3" className="h-4 w-4 text-ink-500" />
            {d.edit}
          </button>
          {onOpenDetail && (
            <button
              type="button"
              onClick={() => { void playHaptic('selection'); onOpenDetail() }}
              aria-label={d.title}
              className="v2-pressable tap-target grid w-11 place-items-center rounded-2xl border border-line bg-page text-ink-500"
            >
              <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {savedAt > 0 && !editing && (
        <p role="status" data-testid="today-steps-saved" className="mt-2 text-xs font-bold text-[color:var(--v2-green-text)]">{d.saved}</p>
      )}
    </section>
  )
}
