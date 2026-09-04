import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { WizardCtx } from '../stepProps'
import type { Profile } from '@/types/profile'
import { hasNumericNutritionPrescription, nutritionStyleOptions, targetCaloriesFor } from '@/lib/calculators'
import { generatePlan, generateNutrition, buildWeeklySchedule, planTitle } from '@/lib/planGenerator'
import { generatePlanFromTemplate, planExerciseName } from '@/lib/workoutPlan'
import { mealDisplayName } from '@/lib/nutritionPlan'
import { declaredGoalTypeLabel } from '@/lib/declaredGoalWording'
import { commitmentName } from '@/lib/commitmentPlan'
import { workoutTemplates } from '@/data/workoutTemplates'
import { routineTypeColors } from '@/data/routine'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { localizeGeneratedWarnings, profileChoiceStrings } from '@/i18n/dict/profileChoices'

/** خطوة توليد الخطة — قِمّة تجهّز خطة جاهزة من بياناتك (الأهداف للعرض فقط). */
export function StepGeneratePlan({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const choices = profileChoiceStrings[ctx.lang]
  const p = ctx.data.profile
  const [showTemplates, setShowTemplates] = useState(false)
  // لا «سوق قوالب» للمبتدئ — نُبقي الخطة المولّدة تلقائيًا بلا تشتيت.
  const isBeginner = p.experienceLevel === 'beginner' || p.trainingLevel === 'beginner'
  const applied = useRef(false)

  // ولّد الخطة وطبّقها مرة عند الدخول
  useEffect(() => {
    if (applied.current) return
    applied.current = true
    const g = generatePlan(p)
    ctx.update({
      profile: { ...p, goal: g.targets ? p.goal : p.goal },
      targets: g.targets,
      targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: undefined, updatedAt: undefined },
      workoutPlan: g.workoutPlan,
      nutritionPlan: g.nutritionPlan,
      commitmentPlan: g.commitmentPlan,
      measurementPlan: g.measurementPlan,
      routine: g.weeklySchedule,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generated = useMemo(() => generatePlan(p), [p])
  const warnings = localizeGeneratedWarnings(ctx.lang, generated.warningsAr)

  const planName = planTitle(ctx.data.workoutPlan.templateId, ctx.lang)
  // [CTO-71] البند ٣ — السطح الثالث: صياغة الهدف في **تفسير الخطة** تتبع المستوى
  // المُعلَن، فلا يقرأ المبتدئ «لأنك تنشيف» بعد أن عُولج الملف ومعاينة الخطة.
  // العلاج عند العرض لا عند التوليد — نفس مذهب الوحدة: التفسير المخزَّن عند
  // المستخدمين القائمين يحمل المصطلح الخام أصلًا، والاشتقاق هنا يشمل الجميع.
  const explanation = choices.generatedPlanReason(
    planName,
    declaredGoalTypeLabel(ctx.lang, p.goalType, choices.goal[p.goalType]),
    choices.trainingLevel[p.trainingLevel],
    Math.max(1, Math.min(7, Math.round(p.trainingDays))),
    p.workoutEnvironment === 'home',
  )
  const firstDay = ctx.data.workoutPlan.days[0]
  const calories = targetCaloriesFor(p.goal, ctx.data.targets)
  const np = ctx.data.nutritionPlan
  const hasNumericTargets = hasNumericNutritionPrescription(ctx.data.targets)

  const chooseTemplate = (id: string) => {
    ctx.update({ workoutPlan: generatePlanFromTemplate(id), routine: buildWeeklySchedule(id, p.trainingDays) })
    setShowTemplates(false)
  }

  const setNutPref = (partial: Partial<Profile>) => {
    const next = { ...p, ...partial }
    ctx.update({ profile: next })
    if (next.trackNutrition) {
      ctx.update({ nutritionPlan: generateNutrition(next, ctx.data.targets).plan })
    } else {
      ctx.update({ nutritionPlan: { ...ctx.data.nutritionPlan, enabled: false } })
    }
  }

  return (
    <div>
      <StepHeader icon="Sparkles" title={d.genTitle} description={d.genDescription} />

      <p className="mb-5 rounded-xl border border-primary-soft bg-primary-soft p-4 text-sm font-bold text-ink-900">
        {d.genIntro}
      </p>

      {/* الأهداف (عرض فقط) */}
      <Card icon="BarChart3" title={hasNumericTargets ? d.genDailyTargets : choices.minorNutritionGuidanceTitle}>
        {hasNumericTargets ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Stat label={d.genCalories} value={`${calories}`} />
            <Stat label={d.genProtein} value={`${ctx.data.targets.proteinGrams}${d.gGram}`} />
            <Stat label={d.genCarbs} value={`${ctx.data.targets.carbsGrams}${d.gGram}`} />
            <Stat label={d.genFat} value={`${ctx.data.targets.fatGrams}${d.gGram}`} />
            <Stat label={d.genWater} value={`${ctx.data.targets.waterLiters}${d.lLiter}`} />
            <Stat label="BMI" value={`${ctx.data.targets.bmi}`} />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-ink-700" data-testid="generated-plan-under18-policy">{choices.minorNutritionGuidanceBody}</p>
        )}
      </Card>

      {/* جدول التمرين المقترح */}
      <Card icon="Dumbbell" title={d.genSuggestedSchedule}>
        <p className="text-sm font-bold text-ink-900">{planName}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">{explanation}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ctx.data.routine.map((d) => (
            <span key={d.day} className={cn('rounded-md border px-2 py-0.5 text-[11px] font-bold', routineTypeColors[d.type])}>
              {(choices.weekdays[d.day] ?? d.day).slice(0, 3)}: {choices.routineType[d.type]}
            </span>
          ))}
        </div>

        {firstDay && (
          <div className="mt-3 rounded-xl border border-line bg-page p-3">
            <p className="text-xs font-bold text-ink-700">{ctx.lang === 'en' ? firstDay.nameEn : firstDay.nameAr}</p>
            <ul className="mt-1.5 space-y-0.5">
              {firstDay.exercises.slice(0, 5).map((pe) => (
                <li key={pe.id} className="truncate text-xs text-ink-500">• {planExerciseName(pe, ctx.lang)} — {pe.sets}×{pe.reps}</li>
              ))}
            </ul>
          </div>
        )}

        {!isBeginner && (
          <button type="button" onClick={() => setShowTemplates((v) => !v)} className="btn-ghost mt-3 px-3 py-2 text-xs">
            <Icon name="Layers" className="h-4 w-4" />
            {d.genChooseAnother}
          </button>
        )}
        {!isBeginner && showTemplates && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {workoutTemplates.filter((t) => t.id !== 'custom').map((t) => (
              <button key={t.id} type="button" onClick={() => chooseTemplate(t.id)} className={cn('rounded-xl border p-3 text-start text-sm', t.id === ctx.data.workoutPlan.templateId ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige')}>
                <span className="font-bold text-ink-900">{ctx.lang === 'en' ? t.nameEn : t.nameAr}</span>
                <span className="block text-[11px] text-ink-400">{t.days.length} {d.daysWord} · {choices.recommendedFor[t.recommendedFor] ?? t.recommendedFor}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* التغذية */}
      <Card icon="Salad" title={d.genNutritionPlan}>
        <button type="button" aria-pressed={p.trackNutrition} onClick={() => setNutPref({ trackNutrition: !p.trackNutrition })} className={cn('flex w-full items-center justify-between rounded-xl border p-3', p.trackNutrition ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface')}>
          <span className="text-sm font-bold text-ink-900">{d.genTrackNutrition}</span>
          <span className={cn('relative h-6 w-11 rounded-full', p.trackNutrition ? 'bg-primary' : 'bg-line')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow', p.trackNutrition ? 'start-0.5' : 'end-0.5')} />
          </span>
        </button>

        {p.trackNutrition && (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-ink-500">{d.genMealsCount}</span>
                <div className="flex gap-2">
                  {[3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setNutPref({ mealsPerDay: n })} className={cn('flex-1 rounded-lg border py-2 text-sm font-bold', p.mealsPerDay === n ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700')}>{n}</button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-ink-500">{d.genNutritionStyle}</span>
                <select className="w-full rounded-lg border border-line bg-beige px-2.5 py-2 text-sm text-ink-900 focus:outline-none" value={p.nutritionStyle} onChange={(e) => setNutPref({ nutritionStyle: e.target.value as Profile['nutritionStyle'] })}>
                  {nutritionStyleOptions.map((o) => <option key={o.value} value={o.value}>{choices.nutritionStyle[o.value]}</option>)}
                </select>
              </label>
            </div>
            {hasNumericTargets && <div className="mt-3 rounded-xl border border-line bg-page p-3">
              <p className="text-xs font-bold text-primary-c">{d.genPlanned} {Math.round(np.meals.reduce((a, m) => a + m.calories, 0))} {d.calWord} · {Math.round(np.meals.reduce((a, m) => a + m.protein, 0))}{d.gGram} {d.genPlannedProteinSuffix} ({d.genPlannedTargetPrefix} {np.targetCalories} {d.calWord} · {np.targetProtein}{d.gGram})</p>
              <ul className="mt-1.5 space-y-0.5">
                {np.meals.map((m) => (
                  <li key={m.id} className="truncate text-xs text-ink-500">• {mealDisplayName(m, ctx.lang)} — {m.calories} {d.calWord}</li>
                ))}
              </ul>
            </div>}
          </>
        )}
      </Card>

      {/* الالتزامات المقترحة */}
      <Card icon="CheckCircle2" title={d.genSuggestedCommitments}>
        <div className="flex flex-wrap gap-1.5">
          {ctx.data.commitmentPlan.items.map((it) => (
            <span key={it.id} className="rounded-full bg-beige px-2.5 py-1 text-[11px] font-bold text-ink-700">{commitmentName(it, ctx.lang)}</span>
          ))}
        </div>
      </Card>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4">
          {warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 text-xs leading-relaxed text-ink-700">
              <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />{w}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-4 card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary-c"><Icon name={icon} className="h-5 w-5" /></span>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-page p-2 text-center">
      <p className="text-sm font-black text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  )
}
