import { StepHeader } from '../StepHeader'
import { Icon } from '@/components/Icon'
import type { WizardCtx } from '../stepProps'
import type { SectionVisibility } from '@/lib/customization'

const items: { key: keyof SectionVisibility; label: string; hint: string; icon: string }[] = [
  { key: 'today', label: 'اليوم', hint: 'متابعة يومك خطوة بخطوة', icon: 'Flame' },
  { key: 'workouts', label: 'تمارين القوة', hint: 'تمارينك ومجموعاتك', icon: 'Dumbbell' },
  { key: 'meals', label: 'خطة الأكل', hint: 'وجباتك وسعراتك', icon: 'Salad' },
  { key: 'supplements', label: 'المكملات', hint: 'مكملاتك الغذائية', icon: 'Pill' },
  { key: 'medications', label: 'الأدوية', hint: 'أدويتك وجرعاتها', icon: 'Pill' },
  { key: 'measurements', label: 'القياسات', hint: 'وزنك ومحيطاتك', icon: 'Ruler' },
  { key: 'commitments', label: 'مفاتيح الالتزام', hint: 'عاداتك اليومية', icon: 'CheckCircle2' },
  { key: 'notes', label: 'التنبيه الصحي', hint: 'ملاحظة صحية بسيطة', icon: 'ShieldCheck' },
]

/** خطوة اختيار الأقسام التي تظهر في الصفحة. */
export function StepSections({ ctx }: { ctx: WizardCtx }) {
  const { data, update } = ctx
  const sections = data.sections

  const toggle = (key: keyof SectionVisibility) =>
    update({ sections: { ...sections, [key]: !sections[key] } })

  return (
    <div>
      <StepHeader
        icon="Layers"
        title="الأقسام التي تريدها في صفحتك"
        description="اختر الأقسام اللي تبي تشوفها. تقدر تشغّل أو تطفّي أي قسم لاحقًا."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const on = sections[it.key]
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => toggle(it.key)}
              aria-pressed={on}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-start transition-all ${
                on ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface hover:bg-beige'
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  on ? 'bg-primary text-white' : 'bg-beige text-ink-400'
                }`}
              >
                <Icon name={it.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{it.label}</span>
                <span className="block truncate text-xs text-ink-500">{it.hint}</span>
              </span>
              {/* مفتاح تشغيل/إيقاف */}
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  on ? 'bg-primary' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${
                    on ? 'start-0.5' : 'end-0.5'
                  }`}
                />
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-5 text-xs text-ink-400">الملف الشخصي والهدف يظلّون ظاهرين دائمًا.</p>
    </div>
  )
}
