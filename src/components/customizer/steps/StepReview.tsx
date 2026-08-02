import { useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import { resetQimmah } from '@/lib/resetQimmah'
import { targetCaloriesFor } from '@/lib/calculators'
import { generatePlan, planTitle, type GeneratedPlan } from '@/lib/planGenerator'
import { buildPlanRationale } from '@/lib/planRationale'
import { PlanWhyPanel } from '@/components/plan/PlanWhyPanel'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'
import { planChangeStrings } from '@/i18n/dict/planChanges'
import { buildPlanChanges } from '@/lib/planChanges'
import { declaredGoalLabel } from '@/lib/declaredGoalWording'

/** خطوة المراجعة والحفظ — ملخّص الخطة + منطقة متقدمة. */
export function StepReview({ ctx }: { ctx: WizardCtx }) {
  const d = onboardingStrings[ctx.lang]
  const choices = profileChoiceStrings[ctx.lang]
  const { data } = ctx
  const ch = planChangeStrings[ctx.lang] ?? planChangeStrings.ar
  // فرق بين المحفوظ والمعلّق — يُعاد حسابه مع كل تعديل، فالكتلة حيّة لا لقطة.
  const changes = buildPlanChanges(ctx.saved, data, ctx.lang)
  const [advanced, setAdvanced] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const summary: { label: string; value: string }[] = [
    { label: d.reviewName, value: data.identity.userName },
    { label: d.reviewGoal, value: choices.goal[data.profile.goalType] },
    { label: d.reviewWeight, value: `${data.profile.weightKg} → ${data.profile.targetWeightKg} ${d.unitKg}` },
    { label: d.reviewTargetCalories, value: `${targetCaloriesFor(data.profile.goal, data.targets)}` },
    { label: d.reviewProtein, value: `${data.targets.proteinGrams}${d.gGram}` },
    { label: d.reviewSchedule, value: planTitle(data.workoutPlan.templateId, ctx.lang) },
    { label: d.reviewMeals, value: `${data.nutritionPlan.meals.length}` },
    { label: d.reviewSuppMed, value: `${data.wellnessPlan.supplements.length + data.wellnessPlan.medications.length}` },
    { label: d.reviewMeasurements, value: `${data.measurementPlan.selectedTypeIds.length}` },
  ]

  /**
   * [CTO-65] البند ٤ — سبب كل تغيير عند المراجعة. **توصيل لا بناء:**
   * `lib/planRationale` (المحرّك) و`components/plan/PlanWhyPanel` (العرض) مبنيّان
   * ومغطّيان بإثباتين، لكن مضيفهما الوحيد `views/PlanPreviewView` كان يتيمًا بلا
   * مسار — فالتعليل موجود ولا يصل أحدًا. لا يُكتب تعليل ثانٍ (وإلا صار للتطبيق
   * مصدرا تفسير متناقضان)؛ يُوصَّل القائم إلى الشاشة التي يراها المستخدم فعلًا.
   *
   * **والتعليل يصف الخطة المحفوظة لا خطة يُعاد توليدها:** الحقول الثلاثة التي
   * يقرأها المحرّك (`workoutPlan` · `suggestedWorkoutTemplateId` · `targets`)
   * تُؤخذ من `ctx.data` — فلو غيّر المستخدم القالب يدويًا في خطوة الخطة، شرح
   * السبب يبقى مطابقًا لما بين يديه. باقي حقول `GeneratedPlan` غير مقروءة هنا،
   * وتُملأ من توليد فوق نفس الملف لاستيفاء النوع لا لتغيير رقم.
   */
  const rationale = useMemo(() => {
    const base = generatePlan(data.profile)
    const asSaved: GeneratedPlan = {
      ...base,
      workoutPlan: data.workoutPlan,
      suggestedWorkoutTemplateId: data.workoutPlan.templateId,
      targets: data.targets,
    }
    return buildPlanRationale(data.profile, asSaved)
  }, [data.profile, data.workoutPlan, data.targets])

  return (
    <div>
      <StepHeader
        icon="CheckCircle2"
        title={d.reviewTitle}
        description={d.reviewDescription}
      />

      <div className="rounded-2xl border border-line bg-page p-5">
        {/* [CTO-67] البند ٤ — نفس مصدر التسمية الذي تستهلكه المعاينة والملف
            الشخصي: المستوى المُعلَن يقود الصياغة، لا المصطلح المخزَّن. */}
        <p className="text-sm font-bold text-ink-900">{declaredGoalLabel(ctx.lang, data.profile.goal) ?? data.identity.mainGoal}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-[11px] text-ink-400">{s.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-ink-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* «ليش خطتك كذا؟» — سبب كل قرار مربوطًا بمدخل المستخدم (القرار المقفل ٣-٣). */}
      <div className="mt-5">
        <PlanWhyPanel lang={ctx.lang} rationale={rationale} />
      </div>

      {/* [CTO-65] البند ٤ — «وش بيتغيّر؟»: فرق لا جدول.
          القرار المؤسسي المقفل ٣ يوجب شرح سبب كل تغيير، والملخّص وحده كان يعرض
          القيمة النهائية فقط فيبدو التعديل صامتًا. ما لم يتغيّر لا يظهر هنا. */}
      <section aria-labelledby="plan-changes-title" className="mt-5 rounded-2xl border border-line bg-page p-5">
        <h3 id="plan-changes-title" className="text-sm font-black text-ink-900">{ch.title}</h3>
        {changes.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{ch.none}</p>
        ) : (
          <>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{ch.subtitle}</p>
            <ul className="mt-3 space-y-2.5">
              {changes.map((c) => (
                <li key={c.key} className="rounded-xl border border-line bg-surface p-3">
                  <p className="text-[11px] font-bold text-ink-500">{c.label}</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">
                    {/* النصّ المرئي يفصل القيمتين بسهم، والقارئ الشاشي يسمع
                        جملة «كان … صار …» كاملة بدل رمز بلا معنى. */}
                    <span aria-hidden="true">
                      <span className="text-ink-500 line-through decoration-ink-400/60">{c.before}</span>
                      <span className="px-1.5 text-ink-400">←</span>
                      <span>{c.after}</span>
                    </span>
                    <span className="sr-only">{ch.fromTo(c.before, c.after)}</span>
                  </p>
                  {c.reason && (
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">
                      <span className="font-bold">{ch.reasonPrefix}</span> {c.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
        <Icon name="ShieldCheck" className="h-4 w-4 text-primary-c" />
        {d.reviewEditLater}
      </p>

      {/* منطقة متقدمة */}
      <div className="mt-6 rounded-2xl border border-line">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-sm font-bold text-ink-700"
        >
          <span className="flex items-center gap-2">
            <Icon name="Layers" className="h-4 w-4 text-ink-500" />
            {d.reviewAdvancedOptions}
          </span>
          <Icon
            name="ChevronLeft"
            className={`h-4 w-4 text-ink-400 transition-transform ${advanced ? '-rotate-90' : 'rotate-0'}`}
          />
        </button>

        {advanced && (
          <div className="space-y-3 border-t border-line p-4">
            <p className="text-xs leading-relaxed text-ink-500">
              {d.reviewAdvancedIntro}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={ctx.onExport} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="TrendingDown" className="h-4 w-4" />
                {d.reviewBackup}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <Icon name="TrendingUp" className="h-4 w-4" />
                {d.reviewRestore}
              </button>
              <button type="button" onClick={ctx.onReset} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="RotateCcw" className="h-4 w-4" />
                {d.reviewResetBasic}
              </button>
              <button
                type="button"
                onClick={ctx.onRestartOnboarding}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <Icon name="Sparkles" className="h-4 w-4" />
                {d.reviewRestartOnboarding}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) ctx.onImportFile(f)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-[11px] text-ink-400">
              {d.reviewRestartOnboardingNote}
            </p>

            {/* إعادة ضبط كاملة (خطر) */}
            <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(d.reviewFullResetConfirm)) {
                    resetQimmah()
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-danger"
              >
                <Icon name="RotateCcw" className="h-3.5 w-3.5" />
                {d.reviewFullReset}
              </button>
              <p className="mt-1 text-[11px] text-ink-400">{d.reviewFullResetNote}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
