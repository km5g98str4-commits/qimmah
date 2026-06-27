import { useState } from 'react'
import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { Icon } from '@/components/Icon'
import { SuccessToast } from '@/components/SuccessToast'
import { WorkoutMode } from '@/components/WorkoutMode'
import type { Lang } from '@/lib/appPreferences'
import { useCustomization } from '@/lib/customizationContext'
import { generatePlanFromTemplate, todayPlanDay, planExerciseName } from '@/lib/workoutPlan'
import { persistFinishedSession } from '@/lib/finishWorkout'
import { getExercise } from '@/data/exercises'
import { getTemplate, templateMap } from '@/data/workoutTemplates'
import type { WorkoutSession } from '@/lib/workoutSessions'
import type { PlanDay, WorkoutTemplate } from '@/types/workout'

interface WorkoutViewProps {
  lang: Lang
  onNavigate: (view: AppView) => void
}

// قوالب الأمثلة المعروضة (تطابق مرجع Strong: PPL / Upper-Lower / Full Body / وزن الجسم / أجهزة / قوة).
const EXAMPLE_IDS = ['push-pull-legs', 'upper-lower-4', 'full-body-3', 'home-workout', 'machine-only', 'strength-5x5']

/** تبويب التمرين — بدء سريع، خطتي، قوالبي، وقوالب جاهزة. */
export function WorkoutView({ lang, onNavigate }: WorkoutViewProps) {
  const { customization, applyCustomization } = useCustomization()
  const plan = customization.workoutPlan
  const planDay = todayPlanDay(plan)

  const [activeDay, setActiveDay] = useState<PlanDay | null>(null)
  const [saved, setSaved] = useState(false)
  const [adopted, setAdopted] = useState<string | null>(null)

  const startDay = (day: PlanDay) => setActiveDay(day)

  const startEmpty = () =>
    setActiveDay({ id: `empty-${Date.now()}`, nameAr: 'تمرين فارغ', nameEn: 'Empty Workout', exercises: [] })

  const startTemplate = (tpl: WorkoutTemplate) => {
    const generated = generatePlanFromTemplate(tpl.id)
    const day = generated.days[0]
    if (day) startDay(day)
  }

  const adoptTemplate = (tpl: WorkoutTemplate) => {
    applyCustomization({ ...customization, workoutPlan: generatePlanFromTemplate(tpl.id) })
    setAdopted(tpl.nameAr)
  }

  const finish = (session: WorkoutSession) => {
    persistFinishedSession(session)
    setActiveDay(null)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-page">
      <AppNav current="workout" lang={lang} onNavigate={onNavigate} />

      <main className="container-page space-y-10 py-8">
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow">
              <Icon name="Dumbbell" className="h-3.5 w-3.5" />
              تمرين
            </span>
            <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">تمرين</h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('exercises')}
            aria-label="بحث في المكتبة"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 shadow-card hover:bg-beige"
          >
            <Icon name="Search" className="h-5 w-5" />
          </button>
        </div>

        {/* بدء سريع */}
        <section>
          <H2 icon="Zap">بدء سريع</H2>
          <div className="grid gap-3 sm:grid-cols-2">
            {planDay && planDay.exercises.length > 0 && (
              <button
                type="button"
                onClick={() => startDay(planDay)}
                className="group flex items-center gap-3 rounded-2xl bg-primary p-4 text-start text-white shadow-glow"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
                  <Icon name="Flame" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">ابدأ تمرين اليوم</span>
                  <span className="block truncate text-xs text-white/85">{lang === 'en' ? planDay.nameEn : planDay.nameAr} · {planDay.exercises.length} تمارين</span>
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={startEmpty}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start shadow-card hover:bg-beige"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name="Plus" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-ink-900">ابدأ تمرين فارغ</span>
                <span className="block text-xs text-ink-400">سجّل مجموعاتك بدون جدول مسبق</span>
              </span>
            </button>
          </div>
        </section>

        {/* خطتي */}
        <section id="workout-myplan">
          <H2 icon="CalendarDays">خطتي</H2>
          {plan.days.length === 0 ? (
            <EmptyCard text="ما عندك جدول حالي — اختر قالبًا جاهزًا بالأسفل واعتمده." />
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink-900">{getTemplate(plan.templateId)?.nameAr ?? 'جدول مخصّص'}</p>
                  <p className="text-xs text-ink-400">{plan.days.length} أيام/أسبوع</p>
                </div>
                <button type="button" onClick={() => onNavigate('setup')} className="btn-ghost shrink-0 px-3 py-2 text-xs">
                  <Icon name="Palette" className="h-4 w-4" />
                  تعديل
                </button>
              </div>

              {/* يوم اليوم */}
              {planDay && (
                <div className="mt-4 rounded-xl border border-line bg-page p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary-c">تمرين اليوم</p>
                      <p className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? planDay.nameEn : planDay.nameAr}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {planDay.exercises.slice(0, 4).map((pe) => planExerciseName(pe, lang).split(' — ')[0]).join(' · ') || 'لا تمارين'}
                      </p>
                    </div>
                    {planDay.exercises.length > 0 && (
                      <button type="button" onClick={() => startDay(planDay)} className="btn-primary shrink-0 px-4 py-2.5 text-xs">
                        <Icon name="Flame" className="h-4 w-4" />
                        ابدأ
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* بقية الأيام */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {plan.days.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => startDay(d)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-start hover:bg-beige"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink-900">{lang === 'en' ? d.nameEn : d.nameAr}</span>
                      <span className="block text-[11px] text-ink-400">{d.exercises.length} تمارين · ~{estDayMinutes(d)} د</span>
                    </span>
                    <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* قوالبي */}
        <section>
          <H2 icon="Layers">قوالبي</H2>
          <EmptyCard text="ما أنشأت قوالب خاصة بعد. اعتمد قالبًا جاهزًا أو عدّل خطتك لتصير قالبك." />
        </section>

        {/* قوالب جاهزة */}
        <section>
          <H2 icon="Boxes">قوالب جاهزة</H2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {EXAMPLE_IDS.map((id) => templateMap[id]).filter(Boolean).map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                lang={lang}
                onStart={() => startTemplate(tpl)}
                onAdopt={() => adoptTemplate(tpl)}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* وضع التمرين */}
      {activeDay && (
        <WorkoutMode lang={lang} day={activeDay} onClose={() => setActiveDay(null)} onFinish={finish} />
      )}

      {/* تأكيد الحفظ */}
      {saved && (
        <SuccessToast
          onClose={() => setSaved(false)}
          title="تم حفظ تمرينك"
          body="تم تحديث أوزانك وسجل التمرين."
          actionLabel="خطتي"
          scrollTo="workout-myplan"
        />
      )}

      {/* تأكيد اعتماد قالب */}
      {adopted && (
        <SuccessToast
          onClose={() => setAdopted(null)}
          title="تم اعتماد الجدول"
          body={`صار «${adopted}» جدولك الحالي. تقدر تبدأ تمرين اليوم أو تعدّله.`}
          actionLabel="خطتي"
          scrollTo="workout-myplan"
        />
      )}
    </div>
  )
}

/** تقدير مدة اليوم بالدقائق من المجموعات والراحة. */
function estDayMinutes(day: PlanDay): number {
  const sec = day.exercises.reduce((sum, pe) => {
    const ex = getExercise(pe.exerciseId)
    const sets = pe.sets || ex?.defaultSets || 3
    const rest = pe.restSec || ex?.defaultRestSec || 90
    return sum + sets * (rest + 40)
  }, 0)
  return Math.max(5, Math.round(sec / 60 / 5) * 5)
}

function TemplateCard({
  tpl,
  lang,
  onStart,
  onAdopt,
}: {
  tpl: WorkoutTemplate
  lang: Lang
  onStart: () => void
  onAdopt: () => void
}) {
  const day1 = tpl.days[0]
  const preview = (day1?.exerciseIds ?? [])
    .slice(0, 3)
    .map((id) => getExercise(id))
    .filter(Boolean)
    .map((e) => e!.nameAr)
    .join(' · ')
  const genDay = day1 ? { exercises: day1.exerciseIds } : { exercises: [] }
  const mins = day1
    ? Math.max(5, Math.round((genDay.exercises.reduce((s, id) => {
        const ex = getExercise(id)
        return s + (ex?.defaultSets ?? 3) * ((ex?.defaultRestSec ?? 90) + 40)
      }, 0) / 60) / 5) * 5)
    : 0

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-ink-900">{lang === 'en' ? tpl.nameEn : tpl.nameAr}</p>
          <p className="text-[11px] text-ink-400">{tpl.nameEn}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-c">
          {tpl.days.length} أيام
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-500">{tpl.descriptionAr}</p>

      {preview && (
        <p className="mt-2 truncate text-[11px] text-ink-400">
          <Icon name="Dumbbell" className="me-1 inline h-3 w-3" />
          {preview}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-ink-500">
        <span>{tpl.days.length} أيام/أسبوع</span>
        {mins > 0 && <span>~{mins} د/يوم</span>}
        <span>{tpl.recommendedFor}</span>
      </div>

      <div className="mt-3 flex gap-2 border-t border-line pt-3">
        <button type="button" onClick={onStart} className="btn-primary flex-1 px-3 py-2 text-xs">
          <Icon name="Flame" className="h-4 w-4" />
          ابدأ
        </button>
        <button type="button" onClick={onAdopt} className="btn-ghost flex-1 px-3 py-2 text-xs">
          <Icon name="Check" className="h-4 w-4" />
          اعتمد
        </button>
      </div>
    </div>
  )
}

function H2({ icon, children }: { icon: string; children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-ink-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {children}
    </h2>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-8 text-center">
      <p className="text-sm text-ink-500">{text}</p>
    </div>
  )
}
