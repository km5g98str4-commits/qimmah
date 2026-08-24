import { useEffect, useRef } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { SessionStageRail } from '@/components/workout/SessionStageRail'
import type { Lang } from '@/lib/appPreferences'
import { warmupStrings } from '@/i18n/dict/warmup'
import type { WarmupPlan } from '@/lib/warmupPlan'
import { canonicalExerciseId } from '@/data/exercises'
import { exerciseMediaManifest } from '@/data/exerciseMediaManifest.generated'
import { getCue } from '@/lib/coaching/cues'

/**
 * هل لهذا التمرين إطارٌ حقيقي مُلتزَم في المستودع؟ [WORKOUT-CONTINUITY-001] الإصلاح ٤.
 *
 * القراءة من السجلّ المُولَّد لا من وجود الملف: `status === 'stills'` تعني إطارَي
 * بداية/نهاية **مفحوصَي المقاس ومعروفَي الحقوق** (yuhonas/free-exercise-db · Unlicense).
 * و`placeholder-only` (بطاقات الأجهزة) و`missing` تُعامَلان سواءً: لا صورة.
 * صورةٌ خاطئة أسوأ من لا صورة — وهذا ما يجعل سطر التعليمة أدناه **مطلبًا لا زينة**.
 */
function hasStillMedia(exerciseId: string): boolean {
  const entry =
    exerciseMediaManifest[exerciseId] ?? exerciseMediaManifest[canonicalExerciseId(exerciseId)]
  return entry?.status === 'stills'
}

/**
 * شاشة الإحماء — [SOVEREIGN-TODAY-001] المهمّة ١.
 *
 * **أول مرحلة في الجلسة، لا بطاقة داخلها.** المسار صار يُقرأ:
 * «إحماء ← التمارين ← الإنهاء»، والمؤشّر أعلى الشاشة يقول أين نحن.
 * قبل هذه الشاشة كانت الجلسة تبدأ بالمجموعة العاملة الأولى مباشرةً بينما
 * «اليوم» يَعِد بإحماء — فالوعد يُسلَّم الآن قبل أول مجموعة عمل حرفيًّا.
 *
 * **التخطّي مسموح ومُعلَن.** من يتخطّى لا يُحسب له إحماء (النصّ يقولها، والكود
 * لا يستدعي `completeFirstWin('warmup')`) — فلا نُبلّغ نجاحًا لم يقع (§6-٤).
 */
interface WarmupScreenProps {
  lang: Lang
  plan: WarmupPlan
  dayNameAr: string
  dayNameEn: string
  /** عدد تمارين الجلسة التي تلي الإحماء — الوعد بما بعده، من اليوم نفسه. */
  exerciseCount: number
  onStart: () => void
  onSkip: () => void
  onDisable: () => void
}

export function WarmupScreen({ lang, plan, dayNameAr, dayNameEn, exerciseCount, onStart, onSkip, onDisable }: WarmupScreenProps) {
  const ar = lang !== 'en'
  const w = warmupStrings[lang] ?? warmupStrings.ar
  const startRef = useRef<HTMLButtonElement>(null)

  // التركيز يبدأ على الفعل الأساسي — الشاشة مرحلة لا تحذير.
  useEffect(() => {
    startRef.current?.focus()
  }, [])

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      data-warmup-screen
      className="flex h-full flex-col overflow-y-auto bg-page px-4 pb-6 pt-4 text-ink-900"
      style={{ paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}
    >
      <div className="mx-auto w-full max-w-md">
        {/* مؤشّر المراحل — مكوّن مشترك مع وضع الجلسة، فلا ينقطع المسار عند العتبة. */}
        <SessionStageRail lang={lang} stage="warmup" />

        <header className="mt-5">
          <h2 className="text-2xl font-black leading-tight tracking-tight">{w.title}</h2>
          <p className="mt-1 text-base leading-relaxed text-ink-500">{w.subtitle}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Icon name="Clock" className="h-4 w-4 shrink-0" aria-hidden="true" />
              {w.estimate(plan.estMinutes)}
            </span>
            <span aria-hidden="true">·</span>
            <bdi className="min-w-0 truncate">{ar ? dayNameAr : dayNameEn}</bdi>
          </p>
          {/* [WORKOUT-CONTINUITY-001] الإصلاح ٤ — ماذا بعد الإحماء؟ الشاشة كانت
              تُنهي عند «ابدأ التمرين» بلا ذكر لما ينتظر خلفها، فيبدو الإحماء
              نهايةً لا مرحلة. الرقم من اليوم نفسه لا مكتوبًا بيد. */}
          {exerciseCount > 0 && (
            <p data-warmup-next className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-ink-700">
              <Icon name="ArrowLeft" className="mt-0.5 h-4 w-4 shrink-0 rotate-180 text-primary-c" aria-hidden="true" />
              {w.afterWarmup(exerciseCount)}
            </p>
          )}
        </header>

        <ol className="mt-5 space-y-2">
          {plan.steps.map((step, i) => {
            /* [WORKOUT-CONTINUITY-001] الإصلاح ٤ — الإحماء كان اسمًا ورقمًا وبس.
               قياس: صفر صورة وصفر تعليمة على كل خطوة. الآن سطران يقولان **كيف**:
                 • سطر نوع الخطوة — من قاموس هذه الحارة، يشرح مقصد البار/النسبة/الخفيفة.
                 • سطر الإعداد المؤلَّف لهذا التمرين بعينه (`getCue`، تغطية ١٨١/١٨١
                   بالعربية والإنجليزية) — تعليمة حقيقية لا نصّ عام.
               والصورة تُعرض **فقط** حين يكون لها إطار معروف الحقوق؛ وما عداه يعتمد
               على النصّ. لا صورة مستعارة ولا GIF مُعلَّم (§8 قرار مقفل ٨). */
            const cue = getCue(step.exerciseId, lang).steps[0]
            const showMedia = hasStillMedia(step.exerciseId)
            return (
              <li
                key={`${step.exerciseId}-${step.label}-${i}`}
                className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
              >
                {showMedia ? (
                  <span className="w-14 shrink-0 overflow-hidden rounded-xl border border-line">
                    <ExerciseMedia
                      exerciseId={step.exerciseId}
                      lang={lang}
                      variant="thumb"
                      heightClass="h-14"
                      hideChips
                    />
                  </span>
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-[11px] font-black text-primary-c">
                    {w.stepLabel[step.label]}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <bdi className="block truncate text-base font-bold leading-snug">
                    {ar ? step.nameAr : step.nameEn}
                  </bdi>
                  <span className="block text-sm font-bold text-ink-500 tabular-nums">
                    {showMedia ? `${w.stepLabel[step.label]} · ` : ''}
                    {step.kind === 'ramp' && step.weightKg !== undefined
                      ? w.loadLine(step.weightKg, step.reps)
                      : w.lightLine(step.reps)}
                  </span>
                  <span data-warmup-cue className="mt-1.5 block text-sm leading-relaxed text-ink-700">
                    {w.stepCue[step.label]}
                  </span>
                  {cue && (
                    <span data-warmup-cue className="mt-1 block text-sm leading-relaxed text-ink-500">
                      {cue}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mt-6 grid gap-2">
          <button
            ref={startRef}
            type="button"
            onClick={onStart}
            data-testid="warmup-start"
            className="btn-primary min-h-[52px] w-full py-3"
          >
            <Icon name="Flame" className="h-4 w-4" aria-hidden="true" />
            {w.startCta}
          </button>
          <button
            type="button"
            onClick={onSkip}
            data-testid="warmup-skip"
            className="tap-target w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-700"
          >
            {w.skipCta}
          </button>
          <p className="text-center text-xs leading-relaxed text-ink-400">{w.skipNote}</p>
          <button
            type="button"
            onClick={onDisable}
            data-testid="warmup-disable"
            className="tap-target mx-auto inline-flex items-center px-3 text-xs font-bold text-ink-400 underline underline-offset-4"
          >
            {w.hideForever}
          </button>
        </div>
      </div>
    </div>
  )
}
