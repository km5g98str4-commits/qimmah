import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { cn } from '@/lib/cn'
import { useCustomization } from '@/lib/customizationContext'
import { useToday, weekdayName } from '@/lib/today'
import { TodayWorkoutHero } from '@/sections/TodayWorkoutHero'
import { getTemplate } from '@/data/workoutTemplates'
import { commitmentName } from '@/lib/commitmentPlan'
import { useCommitmentsToday } from '@/lib/commitmentTracking'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { planExerciseName, todayPlanDay } from '@/lib/workoutPlan'
import { todaysFinishedSession } from '@/lib/workoutSessions'
import { mealDisplayName } from '@/lib/nutritionPlan'
import { useNutritionToday } from '@/lib/nutritionTracking'
import { medicationName, supplementName } from '@/lib/wellnessPlan'
import { useWellnessToday } from '@/lib/wellnessTracking'

interface TodayRow {
  key: string
  title: string
  meta?: string
}

interface TodayProps {
  lang: Lang
  onStartWorkout?: () => void
}

/** قسم «اليوم» — لوحة يومية عملية: تمارين، أكل، مكملات، والتزام — مع تتبّع إنجاز محلي. */
export function Today({ lang, onStartWorkout }: TodayProps) {
  const { customization } = useCustomization()
  const { toggle, isDone, resetDay } = useToday()
  const nutritionToday = useNutritionToday()
  const wellnessToday = useWellnessToday()
  const commitmentsToday = useCommitmentsToday()
  const { userName } = customization.identity
  const tn = getStrings(lang).nutrition
  const twell = getStrings(lang).wellness
  const tc = getStrings(lang).commit
  const planDay = todayPlanDay(customization.workoutPlan)
  const finishedToday = todaysFinishedSession()
  const splitName = (() => {
    const tpl = getTemplate(customization.workoutPlan.templateId)
    return tpl ? (lang === 'en' ? tpl.nameEn : tpl.nameAr) : undefined
  })()
  const np = customization.nutritionPlan
  const wp = customization.wellnessPlan
  const cp = customization.commitmentPlan

  // مصادر اليوم — تعكس بيانات المستخدم المخصّصة من مركز التخصيص
  const groups = useMemo(
    () => [
      {
        id: 'w',
        title: planDay
          ? `${weekdayName(lang === 'en' ? 'en' : 'ar')} — ${lang === 'en' ? planDay.nameEn : planDay.nameAr}`
          : 'تمرين اليوم',
        icon: 'Dumbbell',
        rows: (planDay?.exercises ?? []).map<TodayRow>((pe, i) => ({
          key: `w:${i}`,
          title: planExerciseName(pe, lang),
          meta: `${pe.sets}×${pe.reps}${pe.startingWeight ? ` · ${pe.startingWeight}` : ''}`,
        })),
      },
    ],
    [planDay, lang],
  )

  const allRows = useMemo(() => groups.flatMap((g) => g.rows), [groups])
  const doneCount = allRows.filter((r) => isDone(r.key)).length
  const total = allRows.length
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  return (
    <section id="today" className="section pt-12 sm:pt-16">
      <div className="container-page">
        {/* ترويسة اليوم + المؤشر */}
        <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <span className="eyebrow">
              <Icon name="Flame" className="h-3.5 w-3.5" />
              يومك
            </span>
            <h2 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">
              يومك، {userName} 👋
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              علّم كل شي تخلّصه — وتابع التزامك خطوة بخطوة.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-ink-700">إنجاز اليوم</span>
              <span className="font-black text-primary-c">
                {doneCount}/{total} · {pct}%
              </span>
            </div>
            <ProgressBar current={doneCount} target={total || 1} color="bg-primary" className="mt-2 h-2.5" />
            <button
              type="button"
              onClick={resetDay}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-primary-c"
            >
              <Icon name="RotateCcw" className="h-3.5 w-3.5" />
              إعادة ضبط اليوم
            </button>
          </div>
        </div>

        {/* بطاقة تمرين اليوم النشطة */}
        {planDay && (
          <div className="mt-6">
            <TodayWorkoutHero
              lang={lang}
              day={planDay}
              splitName={splitName}
              finished={!!finishedToday}
              onStart={onStartWorkout}
              waterLiters={np.enabled ? np.targetWaterLiters : undefined}
              proteinG={np.enabled ? np.targetProtein : undefined}
            />
          </div>
        )}

        {/* بطاقات المجموعات */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {groups.map((g) => {
            const gDone = g.rows.filter((r) => isDone(r.key)).length
            return (
              <div key={g.id} className="card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                      <Icon name={g.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="text-base font-bold text-ink-900">{g.title}</h3>
                  </div>
                  <span className="rounded-full bg-beige px-2.5 py-1 text-xs font-bold text-ink-500">
                    {gDone}/{g.rows.length}
                  </span>
                </div>

                {g.rows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-400">لا عناصر لهذا اليوم.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {g.rows.map((row) => {
                      const done = isDone(row.key)
                      return (
                        <li key={row.key}>
                          <button
                            type="button"
                            onClick={() => toggle(row.key)}
                            aria-pressed={done}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl border p-3.5 text-start transition-all duration-150 active:scale-[0.99]',
                              done
                                ? 'border-primary-soft bg-primary-soft'
                                : 'border-line bg-surface hover:bg-beige',
                            )}
                          >
                            <span
                              className={cn(
                                'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
                                done
                                  ? 'border-transparent bg-primary text-white'
                                  : 'border-line text-transparent',
                              )}
                            >
                              <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  'block truncate text-sm font-bold',
                                  done ? 'text-ink-500 line-through' : 'text-ink-900',
                                )}
                              >
                                {row.title}
                              </span>
                              {row.meta && (
                                <span className="block truncate text-xs text-ink-400">{row.meta}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* بطاقة التغذية: أهداف + وجبات + ماء */}
        {np.enabled && (
          <div className="mt-6 card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name="Salad" className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-ink-900">{tn.title}</h3>
            </div>

            {/* أهداف مختصرة */}
            <div className="grid grid-cols-3 gap-3">
              <MiniTarget icon="Flame" label={tn.calories} value={`${np.targetCalories}`} />
              <MiniTarget icon="Salad" label={tn.protein} value={`${np.targetProtein}غ`} />
              <MiniTarget icon="Droplets" label={tn.water} value={`${np.targetWaterLiters} لتر`} />
            </div>

            {/* الوجبات */}
            {np.meals.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {np.meals.map((meal) => {
                  const mdone = nutritionToday.isMealDone(meal.id)
                  return (
                    <li key={meal.id}>
                      <button
                        type="button"
                        onClick={() => nutritionToday.toggleMeal(meal.id)}
                        aria-pressed={mdone}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border p-3.5 text-start transition-all active:scale-[0.99]',
                          mdone ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige',
                        )}
                      >
                        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', mdone ? 'border-transparent bg-primary text-white' : 'border-line text-transparent')}>
                          <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-sm font-bold', mdone ? 'text-ink-500 line-through' : 'text-ink-900')}>
                            {mealDisplayName(meal, lang)}
                          </span>
                          <span className="block truncate text-xs text-ink-400">{meal.calories} {tn.calories} · {meal.protein}غ {tn.protein}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* الماء */}
            <div className="mt-4 rounded-xl border border-line bg-page p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
                  <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
                  {tn.water}
                </span>
                <span className="text-sm font-black text-primary-c">
                  {(nutritionToday.state.waterMl / 1000).toFixed(2)} / {np.targetWaterLiters} لتر
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => nutritionToday.addWater(250)} className="btn-ghost px-3 py-2 text-xs">{tn.addWater250}</button>
                <button type="button" onClick={() => nutritionToday.addWater(500)} className="btn-ghost px-3 py-2 text-xs">{tn.addWater500}</button>
                <button type="button" onClick={nutritionToday.resetWater} className="btn-ghost px-3 py-2 text-xs">
                  <Icon name="RotateCcw" className="h-3.5 w-3.5" />
                  {tn.resetWater}
                </button>
              </div>
              <CustomWater lang={lang} onAdd={nutritionToday.addWater} />
            </div>
          </div>
        )}

        {/* بطاقة المكملات والأدوية */}
        {wp.enabled && (wp.supplements.length > 0 || wp.medications.length > 0) && (
          <div className="mt-6 card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name="Pill" className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-ink-900">{twell.title}</h3>
            </div>

            <ul className="space-y-2.5">
              {wp.supplements.map((s) => {
                const sdone = wellnessToday.isSupplementDone(s.id)
                return (
                  <WellnessRow key={s.id} done={sdone} onToggle={() => wellnessToday.toggleSupplement(s.id)} title={supplementName(s, lang)} meta={[s.amount, s.timing].filter(Boolean).join(' · ')} badge={twell.supplementsTab} />
                )
              })}
              {wp.medications.map((m) => {
                const mdone = wellnessToday.isMedicationDone(m.id)
                return (
                  <WellnessRow key={m.id} done={mdone} onToggle={() => wellnessToday.toggleMedication(m.id)} title={medicationName(m, lang)} meta={[m.dose, m.timing].filter(Boolean).join(' · ')} badge={twell.medicationsTab} medical />
                )
              })}
            </ul>

            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink-400">
              <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {twell.medSafety}
            </p>
          </div>
        )}

        {/* بطاقة الالتزامات */}
        {cp.enabled && cp.items.length > 0 && (
          <div className="mt-6 card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
                  <Icon name="CheckCircle2" className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold text-ink-900">{tc.title}</h3>
              </div>
              <span className="rounded-full bg-beige px-2.5 py-1 text-xs font-bold text-ink-500">
                {cp.items.filter((i) => commitmentsToday.isDone(i.id)).length}/{cp.items.length}
              </span>
            </div>
            <ul className="space-y-2.5">
              {cp.items.map((it) => {
                const cdone = commitmentsToday.isDone(it.id)
                return (
                  <WellnessRow
                    key={it.id}
                    done={cdone}
                    onToggle={() => commitmentsToday.toggle(it.id)}
                    title={commitmentName(it, lang)}
                    meta=""
                    badge={it.frequency === 'weekly' ? tc.weekly : it.frequency === 'custom' ? tc.custom : tc.daily}
                  />
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function WellnessRow({ done, onToggle, title, meta, badge, medical }: { done: boolean; onToggle: () => void; title: string; meta: string; badge: string; medical?: boolean }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-start transition-all active:scale-[0.99]', done ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige')}
      >
        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', done ? 'border-transparent bg-primary text-white' : 'border-line text-transparent')}>
          <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-bold', done ? 'text-ink-500 line-through' : 'text-ink-900')}>{title}</span>
          {meta && <span className="block truncate text-xs text-ink-400">{meta}</span>}
        </span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', medical ? 'bg-gold-200/60 text-gold-600' : 'bg-beige text-ink-500')}>{badge}</span>
      </button>
    </li>
  )
}

function MiniTarget({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-page p-3 text-center">
      <Icon name={icon} className="mx-auto h-4 w-4 text-primary-c" />
      <p className="mt-1 text-sm font-black text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  )
}

/** إدخال كمية ماء مخصّصة بالمل تُضاف لإجمالي اليوم. */
function CustomWater({ lang, onAdd }: { lang: Lang; onAdd: (ml: number) => void }) {
  const tn = getStrings(lang).nutrition
  const [open, setOpen] = useState(false)
  const [ml, setMl] = useState('')

  const submit = () => {
    const amount = Math.round(Number(ml) || 0)
    if (amount > 0) onAdd(amount)
    setMl('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost mt-2 px-3 py-2 text-xs">
        <Icon name="Plus" className="h-3.5 w-3.5" />
        {tn.customWater}
      </button>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="number"
        min="1"
        autoFocus
        value={ml}
        onChange={(e) => setMl(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder={tn.customWaterPlaceholder}
        className="w-40 rounded-lg border border-line bg-page px-3 py-2 text-xs text-ink-900 outline-none focus:border-primary-c"
      />
      <button type="button" onClick={submit} className="btn-primary px-3 py-2 text-xs">{tn.customWaterAdd}</button>
      <button type="button" onClick={() => { setOpen(false); setMl('') }} aria-label={tn.close} className="btn-ghost px-2 py-2 text-xs">
        <Icon name="X" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
