import { useState } from 'react'
import type { ReactNode } from 'react'
import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import { ExerciseLibraryPicker } from '@/components/ExerciseLibraryPicker'
import type { WizardCtx } from '../stepProps'
import type { PlanDay, PlanExercise, WorkoutPlan } from '@/types/workout'
import { workoutTemplates } from '@/data/workoutTemplates'
import { createPlanExercise, generatePlanFromTemplate, planExerciseName, planExerciseVideo } from '@/lib/workoutPlan'
import { parseSafeNumber } from '@/lib/validation'

const smallInput =
  'w-full rounded-lg border border-line bg-beige px-2.5 py-1.5 text-sm text-ink-900 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

/** خطوة اختيار جدول التمرين — قوالب + أيام قابلة للتعديل + مكتبة تمارين. */
export function StepWorkoutTemplate({ ctx }: { ctx: WizardCtx }) {
  const plan = ctx.data.workoutPlan
  const setPlan = (p: WorkoutPlan) => ctx.update({ workoutPlan: p })
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null)
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)

  const hasContent = plan.days.some((d) => d.exercises.length > 0)

  const chooseTemplate = (id: string) => {
    if (id === plan.templateId) return
    if (hasContent) setPendingTemplate(id)
    else setPlan(generatePlanFromTemplate(id))
  }
  const confirmTemplate = () => {
    if (pendingTemplate) setPlan(generatePlanFromTemplate(pendingTemplate))
    setPendingTemplate(null)
  }

  const updateDay = (dayId: string, partial: Partial<PlanDay>) =>
    setPlan({ ...plan, days: plan.days.map((d) => (d.id === dayId ? { ...d, ...partial } : d)) })

  const updateExercise = (dayId: string, exId: string, partial: Partial<PlanExercise>) =>
    setPlan({
      ...plan,
      days: plan.days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...partial } : e)) }
          : d,
      ),
    })

  const reindex = (list: PlanExercise[]) => list.map((e, i) => ({ ...e, order: i }))

  const removeExercise = (dayId: string, exId: string) =>
    setPlan({
      ...plan,
      days: plan.days.map((d) =>
        d.id === dayId ? { ...d, exercises: reindex(d.exercises.filter((e) => e.id !== exId)) } : d,
      ),
    })

  const moveExercise = (dayId: string, index: number, dir: -1 | 1) =>
    setPlan({
      ...plan,
      days: plan.days.map((d) => {
        if (d.id !== dayId) return d
        const j = index + dir
        if (j < 0 || j >= d.exercises.length) return d
        const list = d.exercises.slice()
        ;[list[index], list[j]] = [list[j], list[index]]
        return { ...d, exercises: reindex(list) }
      }),
    })

  const addExercise = (dayId: string, exerciseId: string) => {
    setPlan({
      ...plan,
      days: plan.days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: reindex([...d.exercises, createPlanExercise(exerciseId, dayId, d.exercises.length)]) }
          : d,
      ),
    })
    setPickerDayId(null)
  }

  return (
    <div>
      <StepHeader
        icon="Dumbbell"
        title="اختيار جدول التمرين"
        description="اختر قالبًا جاهزًا ثم عدّله كما تحب — أضف من المكتبة أو احذف."
      />

      {/* تنبيه الاستبدال */}
      {pendingTemplate && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-700">
            سيتم استبدال جدول التمرين الحالي. تقدر تعدل كل شيء بعد الاختيار.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPendingTemplate(null)} className="btn-ghost px-3 py-2 text-xs">إلغاء</button>
            <button type="button" onClick={confirmTemplate} className="btn-primary px-3 py-2 text-xs">تأكيد</button>
          </div>
        </div>
      )}

      {/* بطاقات القوالب */}
      <div className="grid gap-3 sm:grid-cols-2">
        {workoutTemplates.map((tpl) => {
          const active = tpl.id === plan.templateId
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => chooseTemplate(tpl.id)}
              className={`rounded-2xl border p-4 text-start transition-all ${
                active ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink-900">{tpl.nameAr}</span>
                {active && <Icon name="CheckCircle2" className="h-4 w-4 text-primary-c" />}
              </div>
              <p className="mt-1 text-[11px] text-ink-400">{tpl.nameEn}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">{tpl.descriptionAr}</p>
              <p className="mt-2 text-[11px] font-bold text-primary-c">{tpl.days.length} أيام · {tpl.recommendedFor}</p>
            </button>
          )
        })}
      </div>

      {/* أيام الخطة القابلة للتعديل */}
      <div className="mt-8 space-y-5">
        {plan.days.map((day) => (
          <div key={day.id} className="card p-5">
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <input className={smallInput} value={day.nameAr} onChange={(e) => updateDay(day.id, { nameAr: e.target.value })} placeholder="اسم اليوم (عربي)" />
              <input className={smallInput} value={day.nameEn} onChange={(e) => updateDay(day.id, { nameEn: e.target.value })} placeholder="Day name (English)" />
            </div>

            <ul className="space-y-3">
              {day.exercises.map((pe, i) => (
                <li key={pe.id} className="rounded-xl border border-line bg-page p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-ink-900">{planExerciseName(pe, 'ar')}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <a href={planExerciseVideo(pe)} target="_blank" rel="noopener noreferrer" className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label="شاهد الشرح">
                        <Icon name="Globe" className="h-3.5 w-3.5" />
                      </a>
                      <button type="button" onClick={() => moveExercise(day.id, i, -1)} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label="أعلى">
                        <Icon name="ChevronLeft" className="h-3.5 w-3.5 rotate-90" />
                      </button>
                      <button type="button" onClick={() => moveExercise(day.id, i, 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige" aria-label="أسفل">
                        <Icon name="ChevronLeft" className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                      <button type="button" onClick={() => removeExercise(day.id, pe.id)} className="grid h-7 w-7 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" aria-label="حذف">
                        <Icon name="X" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Labeled label="مجموعات"><input type="number" inputMode="numeric" min={0} max={20} className={smallInput} value={pe.sets} onChange={(e) => updateExercise(day.id, pe.id, { sets: parseSafeNumber(e.target.value, { min: 0, max: 20 }) })} /></Labeled>
                    <Labeled label="تكرارات"><input className={smallInput} value={pe.reps} onChange={(e) => updateExercise(day.id, pe.id, { reps: e.target.value })} /></Labeled>
                    <Labeled label="راحة (ث)"><input type="number" inputMode="numeric" min={0} max={600} className={smallInput} value={pe.restSec} onChange={(e) => updateExercise(day.id, pe.id, { restSec: parseSafeNumber(e.target.value, { min: 0, max: 600 }) })} /></Labeled>
                    <Labeled label="وزن البداية"><input className={smallInput} value={pe.startingWeight ?? ''} onChange={(e) => updateExercise(day.id, pe.id, { startingWeight: e.target.value })} /></Labeled>
                    <div className="col-span-2 sm:col-span-4"><Labeled label="ملاحظات"><input className={smallInput} value={pe.notes ?? ''} onChange={(e) => updateExercise(day.id, pe.id, { notes: e.target.value })} /></Labeled></div>
                    <div className="col-span-2 sm:col-span-4"><Labeled label="رابط شرح (اختياري)"><input className={smallInput} value={pe.videoUrl ?? ''} onChange={(e) => updateExercise(day.id, pe.id, { videoUrl: e.target.value })} placeholder="اتركه فارغًا لاستخدام شرح المكتبة" /></Labeled></div>
                  </div>
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => setPickerDayId(day.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-beige py-3 text-sm font-bold text-ink-700 hover:border-primary-soft hover:text-primary-c">
              <Icon name="Plus" className="h-4 w-4" />
              أضف تمرين من المكتبة
            </button>
          </div>
        ))}
      </div>

      {pickerDayId && (
        <ExerciseLibraryPicker
          lang="ar"
          onAdd={(exerciseId) => addExercise(pickerDayId, exerciseId)}
          onClose={() => setPickerDayId(null)}
        />
      )}
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-ink-400">{label}</span>
      {children}
    </label>
  )
}
