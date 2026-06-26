import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Field, inputClass } from '@/components/customizer/Field'
import { EditableTable, type ColumnDef } from '@/components/customizer/EditableTable'
import { routineTypeLabels } from '@/data/routine'
import {
  type Customization,
  type MealRow,
  type MetricRow,
  type RoutineRow,
  type SupplementRow,
  type WorkoutRow,
  getDefaultCustomization,
  loadCustomization,
  saveCustomization,
  clearCustomization,
  userTypeOptions,
} from '@/lib/customization'

interface CustomizationCenterProps {
  onBack: () => void
}

const supplementTypeOptions = [
  { value: 'supplement', label: 'مكمل' },
  { value: 'medication', label: 'دواء' },
]

const routineTypeOptions = (Object.keys(routineTypeLabels) as RoutineRow['type'][]).map((t) => ({
  value: t,
  label: routineTypeLabels[t],
}))

const workoutColumns: ColumnDef<WorkoutRow>[] = [
  { key: 'name', label: 'التمرين', span: 'sm:col-span-3' },
  { key: 'muscle', label: 'العضلة', span: 'sm:col-span-2' },
  { key: 'sets', label: 'مجموعات', type: 'number', span: 'sm:col-span-2' },
  { key: 'reps', label: 'تكرارات', span: 'sm:col-span-2' },
  { key: 'weight', label: 'الوزن', span: 'sm:col-span-2' },
]

const supplementColumns: ColumnDef<SupplementRow>[] = [
  { key: 'name', label: 'الاسم', span: 'sm:col-span-3' },
  { key: 'dose', label: 'الجرعة', span: 'sm:col-span-3' },
  { key: 'timing', label: 'التوقيت', span: 'sm:col-span-3' },
  { key: 'type', label: 'النوع', options: supplementTypeOptions, span: 'sm:col-span-2' },
]

const mealColumns: ColumnDef<MealRow>[] = [
  { key: 'name', label: 'الوجبة', span: 'sm:col-span-3' },
  { key: 'time', label: 'الوقت', span: 'sm:col-span-2' },
  { key: 'calories', label: 'سعرات', type: 'number', span: 'sm:col-span-2' },
  { key: 'protein', label: 'بروتين', type: 'number', span: 'sm:col-span-2' },
  { key: 'carbs', label: 'كارب', type: 'number', span: 'sm:col-span-1' },
  { key: 'fats', label: 'دهون', type: 'number', span: 'sm:col-span-1' },
]

const metricColumns: ColumnDef<MetricRow>[] = [
  { key: 'label', label: 'القياس', span: 'sm:col-span-5' },
  { key: 'value', label: 'القيمة', span: 'sm:col-span-3' },
  { key: 'unit', label: 'الوحدة', span: 'sm:col-span-3' },
]

const routineColumns: ColumnDef<RoutineRow>[] = [
  { key: 'day', label: 'اليوم', span: 'sm:col-span-3' },
  { key: 'title', label: 'الوصف', span: 'sm:col-span-5' },
  { key: 'type', label: 'النوع', options: routineTypeOptions, span: 'sm:col-span-3' },
]

/** مركز التخصيص — صفحة كاملة لتعديل بيانات القالب وحفظها محليًا (بلا backend). */
export function CustomizationCenter({ onBack }: CustomizationCenterProps) {
  const [data, setData] = useState<Customization>(() => loadCustomization())
  const [saved, setSaved] = useState(false)

  const patch = (partial: Partial<Customization>) => {
    setData((prev) => ({ ...prev, ...partial }))
    setSaved(false)
  }
  const patchIdentity = (partial: Partial<Customization['identity']>) =>
    patch({ identity: { ...data.identity, ...partial } })
  const patchColors = (partial: Partial<Customization['colors']>) =>
    patch({ colors: { ...data.colors, ...partial } })

  const handleSave = () => {
    saveCustomization(data)
    setSaved(true)
  }
  const handleReset = () => {
    clearCustomization()
    setData(getDefaultCustomization())
    setSaved(false)
  }

  const userTypeLabel =
    userTypeOptions.find((o) => o.value === data.identity.userType)?.label ?? ''

  return (
    <div className="min-h-screen bg-ink-950">
      {/* شريط علوي ثابت مع الإجراءات */}
      <header className="sticky top-0 z-40 glass border-b border-white/[0.06]">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950">
              <Icon name="Palette" className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-base font-extrabold text-white sm:text-lg">مركز التخصيص</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              <Icon name="TrendingDown" className="h-4 w-4" />
              <span className="hidden sm:inline">استعادة الافتراضي</span>
              <span className="sm:hidden">افتراضي</span>
            </button>
            <button type="button" onClick={handleSave} className="btn-primary px-3 py-2 text-xs sm:text-sm">
              <Icon name={saved ? 'CheckCircle2' : 'Check'} className="h-4 w-4" />
              {saved ? 'تم الحفظ' : 'حفظ التخصيص'}
            </button>
          </div>
        </div>
      </header>

      <main className="container-page space-y-8 py-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-brand-300"
        >
          <Icon name="ChevronLeft" className="h-4 w-4 rotate-180" />
          العودة للموقع
        </button>

        {/* ملاحظة النسخة الأولية */}
        <div className="flex items-start gap-3 rounded-2xl border border-gold-500/25 bg-gold-500/10 p-4">
          <Icon name="AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
          <p className="text-sm leading-relaxed text-gold-200">
            <span className="font-bold">نسخة أولية:</span> هذا مركز تخصيص مبدئي بلا تسجيل دخول وبلا
            خادم. تُحفظ تعديلاتك في متصفحك فقط (localStorage) على هذا الجهاز، ولن تنتقل لأجهزة أخرى.
            للتخصيص الدائم في الإنتاج، عدّل ملفات <code className="rounded bg-ink-900/60 px-1">config</code> و
            <code className="rounded bg-ink-900/60 px-1">data</code> مباشرة (انظر README).
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* عمود التحرير */}
          <div className="space-y-8 lg:col-span-2">
            {/* الهوية */}
            <CenterSection icon="Sparkles" title="الهوية والعلامة">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم المستخدم / المدرب">
                  <input
                    className={inputClass}
                    value={data.identity.userName}
                    onChange={(e) => patchIdentity({ userName: e.target.value })}
                  />
                </Field>
                <Field label="الشعار النصي (اسم العلامة)">
                  <input
                    className={inputClass}
                    value={data.identity.brandName}
                    onChange={(e) => patchIdentity({ brandName: e.target.value })}
                  />
                </Field>
                <Field label="الشعار / الوصف القصير">
                  <input
                    className={inputClass}
                    value={data.identity.tagline}
                    onChange={(e) => patchIdentity({ tagline: e.target.value })}
                  />
                </Field>
                <Field label="نوع المستخدم">
                  <select
                    className={inputClass}
                    value={data.identity.userType}
                    onChange={(e) =>
                      patchIdentity({ userType: e.target.value as Customization['identity']['userType'] })
                    }
                  >
                    {userTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="الهدف الرئيسي">
                    <textarea
                      className={`${inputClass} min-h-[72px] resize-y`}
                      value={data.identity.mainGoal}
                      onChange={(e) => patchIdentity({ mainGoal: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </CenterSection>

            {/* الألوان */}
            <CenterSection icon="Palette" title="الألوان">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="اللون الأساسي"
                  value={data.colors.primary}
                  onChange={(v) => patchColors({ primary: v })}
                />
                <ColorField
                  label="لون التمييز"
                  value={data.colors.accent}
                  onChange={(v) => patchColors({ accent: v })}
                />
              </div>
            </CenterSection>

            {/* جدول التمارين */}
            <CenterSection icon="Dumbbell" title="جدول التمارين">
              <EditableTable<WorkoutRow>
                items={data.workouts}
                columns={workoutColumns}
                onChange={(workouts) => patch({ workouts })}
                makeEmpty={() => ({ name: '', muscle: '', sets: 3, reps: '10', weight: '' })}
                addLabel="إضافة تمرين"
              />
            </CenterSection>

            {/* المكملات */}
            <CenterSection icon="Pill" title="المكملات والأدوية">
              <EditableTable<SupplementRow>
                items={data.supplements}
                columns={supplementColumns}
                onChange={(supplements) => patch({ supplements })}
                makeEmpty={() => ({ name: '', dose: '', timing: '', type: 'supplement' })}
                addLabel="إضافة مكمل / دواء"
              />
            </CenterSection>

            {/* الوجبات */}
            <CenterSection icon="Salad" title="الوجبات والماكروز">
              <EditableTable<MealRow>
                items={data.meals}
                columns={mealColumns}
                onChange={(meals) => patch({ meals })}
                makeEmpty={() => ({ name: '', time: '', calories: 0, protein: 0, carbs: 0, fats: 0 })}
                addLabel="إضافة وجبة"
              />
            </CenterSection>

            {/* القياسات */}
            <CenterSection icon="Ruler" title="قياسات الجسم">
              <EditableTable<MetricRow>
                items={data.metrics}
                columns={metricColumns}
                onChange={(metrics) => patch({ metrics })}
                makeEmpty={() => ({ label: '', value: '', unit: '' })}
                addLabel="إضافة قياس"
              />
            </CenterSection>

            {/* الروتين */}
            <CenterSection icon="CalendarDays" title="الروتين الأسبوعي">
              <EditableTable<RoutineRow>
                items={data.routine}
                columns={routineColumns}
                onChange={(routine) => patch({ routine })}
                makeEmpty={() => ({ day: '', title: '', type: 'rest' })}
                addLabel="إضافة يوم"
              />
            </CenterSection>
          </div>

          {/* عمود المعاينة الحية */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">معاينة حية</p>
              <div
                className="card overflow-hidden p-6"
                style={{ boxShadow: `0 20px 60px -20px ${data.colors.primary}55` }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: `${data.colors.primary}22`, color: data.colors.primary }}
                >
                  <Icon name="Users" className="h-3 w-3" />
                  {userTypeLabel}
                </span>
                <h3 className="mt-4 text-2xl font-black text-white">{data.identity.brandName}</h3>
                <p className="mt-1 text-sm text-slate-400">{data.identity.tagline}</p>

                <div className="mt-5 rounded-xl border border-white/[0.06] bg-ink-900/60 p-3">
                  <p className="text-[11px] text-slate-500">الهدف الرئيسي</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-200">{data.identity.mainGoal}</p>
                </div>

                <p className="mt-5 text-[11px] text-slate-500">صاحب الحساب</p>
                <p className="text-sm font-bold text-white">{data.identity.userName}</p>

                <div className="mt-5 flex gap-2">
                  <span
                    className="h-8 flex-1 rounded-lg"
                    style={{ backgroundColor: data.colors.primary }}
                  />
                  <span
                    className="h-8 flex-1 rounded-lg"
                    style={{ backgroundColor: data.colors.accent }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <PreviewStat label="تمارين" value={data.workouts.length} />
                  <PreviewStat label="مكملات" value={data.supplements.length} />
                  <PreviewStat label="وجبات" value={data.meals.length} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function CenterSection({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label} hint={value.toUpperCase()}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
        />
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  )
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-900/60 py-2">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  )
}
