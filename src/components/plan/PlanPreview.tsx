import type { Lang } from '@/lib/appPreferences'
import type { GoalType } from '@/types/profile'
import type { GeneratedPlan } from '@/lib/planGenerator'
import { ePlanStrings, fillTemplate } from '@/i18n/dict/ePlan'
import { getExercise } from '@/data/exercises'
import { formatNumeralsIn } from '@/lib/numberFormat'
import { hasNumericNutritionPrescription } from '@/lib/calculators'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'

/**
 * معاينة الخطة (حارة E · المرحلة الثانية — الموجة ٢) — **مكوّن عرضي بحت.**
 *
 * السابقة المعتمدة: بوابة موافقة حارة G (`SyncConsentGate`) — لا يركّب نفسه
 * ولا يقرّر ما بعده.
 *
 * **حدوده القاطعة:** لا يقرأ تخزينًا · لا يستدعي المولّد · لا يملك حالة بيانات.
 * كل ما يعرضه يصل عبر `plan` وحده، وكل رقم فيه **مقيس** من مخرجات المحرّك:
 * عدد الأيام من `workoutPlan.days.length`، وعدد التمارين من طول قائمة كل يوم.
 * فلا يعرض المكوّن رقمًا لم يُنتجه المحرّك.
 *
 * **الترجمة في العرض لا في المصدر (§6):** المكوّن يترجم **معرّف القالب**
 * و**الهدف المنظَّم** عبر قاموسه؛ ولا يعرض أي نصّ يخرج من المحرّك بلغة واحدة.
 * لذلك `explanationAr` و`warningsAr` **لا يُعرضان هنا** — نصّان عربيّان صلبان
 * في المحرّك، وعرضهما في الواجهة الإنجليزية تسريب لغة. الملاحظات تصل عبر
 * `notes` من المستدعي حتى يُحسم شكل مخرجات المحرّك النصّية.
 *
 * **تسلسل العناوين:** `h2` للبطاقة و`h3` لأقسامها — يفترض `h1` في الشاشة
 * المضيفة، وهو النمط القائم في شاشات المنتج.
 */
export function PlanPreview({
  lang,
  plan,
  goalType,
  notes,
}: {
  lang: Lang
  plan: GeneratedPlan
  goalType: GoalType
  notes?: readonly string[]
}) {
  const s = ePlanStrings[lang]
  const policy = profileChoiceStrings[lang]
  const num = (n: number) => (lang === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US'))
  /**
   * اسم يوم الخطة **مُخزَّن** بأرقام لاتينية عمدًا («اليوم 1 · علوي») — انظر
   * `workoutDayLabel.workoutDayNameAr`: تحويله عند التوليد يخلط المخزون ويُفرِغ
   * حارس سياسة الأرقام. فالتحويل عند حدّ العرض، وهو **مفقود هنا**: كانت شاشة
   * الكشف تعرض «اليوم 1 · علوي» بجوار «٧٥ كجم» و«٥ تمارين» — نفس الشاشة
   * بنظامَي أرقام. (رُصد بمراجعة لقطة الكشف، لا بفحص كود.)
   */
  const dayName = (day: { nameAr: string; nameEn: string }) =>
    lang === 'en' ? day.nameEn : formatNumeralsIn(day.nameAr, lang)
  const days = plan.workoutPlan.days
  const firstDay = days[0]
  const splitTitle = s.splitTitles[plan.suggestedWorkoutTemplateId] ?? plan.suggestedWorkoutTemplateId
  const hasNumericNutrition = hasNumericNutritionPrescription(plan.targets)

  const label = fillTemplate(s.planLabel, {
    goal: s.goalLabels[goalType],
    days: fillTemplate(s.daysValue, { n: num(days.length) }),
    split: splitTitle,
  })

  const macros: readonly { key: string; label: string; value: string }[] = [
    { key: 'protein', label: s.protein, value: `${num(plan.targets.proteinGrams)} ${s.gramsUnit}` },
    { key: 'carbs', label: s.carbs, value: `${num(plan.targets.carbsGrams)} ${s.gramsUnit}` },
    { key: 'fat', label: s.fat, value: `${num(plan.targets.fatGrams)} ${s.gramsUnit}` },
    { key: 'water', label: s.water, value: `${num(plan.targets.waterLiters)} ${s.litersUnit}` },
  ]

  return (
    <section
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      data-testid="plan-preview"
      aria-labelledby="plan-preview-title"
      className="mx-auto w-full max-w-md rounded-2xl bg-surface p-5 shadow-lg"
    >
      <h2 id="plan-preview-title" className="text-lg font-semibold text-ink-900">
        {s.previewTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.previewIntro}</p>
      <p className="mt-3 text-sm font-medium text-ink-900" data-testid="plan-preview-label">
        {label}
      </p>

      <h3 className="mt-5 text-sm font-medium text-ink-900">{s.scheduleHeading}</h3>
      {days.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">{s.emptyPlan}</p>
      ) : (
        <ul className="mt-2 space-y-1.5" data-testid="plan-preview-days">
          {days.map((day) => (
            <li
              key={day.id}
              className="flex items-baseline justify-between gap-3 text-sm text-ink-700"
            >
              <span className="text-start">{dayName(day)}</span>
              <span className="shrink-0 text-end text-ink-500">
                {fillTemplate(s.exercisesValue, { n: num(day.exercises.length) })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {firstDay && (
        <>
          <h3 className="mt-5 text-sm font-medium text-ink-900">{s.firstDayHeading}</h3>
          <p className="mt-1 text-sm font-semibold text-ink-700">
            {dayName(firstDay)}
          </p>
          <ol className="mt-2 space-y-2" data-testid="plan-preview-first-day">
            {firstDay.exercises.map((plannedExercise) => {
              const exercise = getExercise(plannedExercise.exerciseId)
              const name = lang === 'en'
                ? plannedExercise.customNameEn ?? exercise?.nameEn ?? s.exerciseFallback
                : plannedExercise.customNameAr ?? exercise?.nameAr ?? s.exerciseFallback
              return (
                <li key={plannedExercise.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                  <p className="font-medium text-ink-900">{name}</p>
                  <p className="mt-0.5 text-ink-500">
                    {fillTemplate(s.setsRepsValue, {
                      sets: num(plannedExercise.sets),
                      reps: plannedExercise.reps,
                    })}
                    {' · '}
                    {fillTemplate(s.restValue, {
                      seconds: num(plannedExercise.restSec),
                      unit: s.secondsUnit,
                    })}
                  </p>
                </li>
              )
            })}
          </ol>
        </>
      )}

      {hasNumericNutrition ? (
        <>
          <h3 className="mt-5 text-sm font-medium text-ink-900">{s.targetsHeading}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.targetsNote}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {num(plan.targets.targetCalories)}{' '}
            <span className="text-sm font-normal text-ink-500">{s.caloriesUnit}</span>
            <span className="sr-only"> {s.calories}</span>
          </p>
          <ul className="mt-2 space-y-1.5" data-testid="plan-preview-macros">
            {macros.map((m) => (
              <li key={m.key} className="flex items-baseline justify-between gap-3 text-sm text-ink-700">
                <span className="text-start">{m.label}</span>
                <span className="shrink-0 text-end text-ink-500">{m.value}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <section className="mt-5 rounded-xl border border-line bg-beige p-3" data-testid="plan-preview-under18-guidance">
          <h3 className="text-sm font-medium text-ink-900">{policy.minorNutritionGuidanceTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">{policy.minorNutritionGuidanceBody}</p>
        </section>
      )}

      {notes && notes.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-medium text-ink-900">{s.notesHeading}</h3>
          <ul className="mt-2 space-y-1.5">
            {notes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
