import { Field, inputClass } from '../Field'
import { StepHeader } from '../StepHeader'
import type { WizardCtx } from '../stepProps'
import { accentOptions } from '@/config/theme'

/** خطوة شكل الصفحة — الألوان. */
export function StepLook({ ctx }: { ctx: WizardCtx }) {
  const { data, updateColors } = ctx
  return (
    <div>
      <StepHeader
        icon="Palette"
        title="شكل الصفحة"
        description="اختر ألوان صفحتك. تنعكس مباشرة على أزرارك ومؤشراتك في كل مكان."
      />

      {/* ألوان جاهزة */}
      <p className="text-xs font-bold text-ink-500">ألوان جاهزة:</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {accentOptions.map((opt) => {
          const active = data.colors.primary.toLowerCase() === opt.swatch.toLowerCase()
          return (
            <button
              key={opt.id}
              type="button"
              aria-label={opt.label}
              onClick={() => updateColors({ primary: opt.swatch })}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${
                active ? 'border-primary-soft bg-primary-soft' : 'border-transparent hover:bg-beige'
              }`}
            >
              <span
                className="h-10 w-10 rounded-lg"
                style={{ backgroundColor: opt.swatch }}
              />
              <span className="text-[11px] text-ink-500">{opt.label}</span>
            </button>
          )
        })}
      </div>

      {/* لون مخصّص */}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <ColorField
          label="اللون الأساسي"
          value={data.colors.primary}
          onChange={(v) => updateColors({ primary: v })}
        />
        <ColorField
          label="لون التمييز"
          value={data.colors.accent}
          onChange={(v) => updateColors({ accent: v })}
        />
      </div>
    </div>
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
          className="h-11 w-16 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
        />
        <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  )
}
